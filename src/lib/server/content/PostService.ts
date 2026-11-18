import { ObjectId } from 'mongodb';
import {
	acceptReplySchema,
	createPostSchema,
	postIdSchema,
	postListQuerySchema,
	POST_KINDS,
	type AcceptedReplyChangeResult,
	type PostCreationResult,
	type PostDetailResponse,
	type PostListResponse
} from '#lib/contracts/PostContract.ts';
import { courseIdSchema } from '#lib/contracts/CourseCatalogContract.ts';
import { AccessDeniedError, AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import {
	contentEventPublisher,
	type ContentEventPublisher
} from '#lib/server/realtime/ContentEventPublisher.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDetail, PostDocument, PostOrderField, PostPagePosition } from './Post.ts';
import { postRepository, type PostRepository } from './PostRepository.ts';
import { PostResponseMapper } from './PostResponseMapper.ts';
import { replyRepository, type ReplyRepository } from './ReplyRepository.ts';

/**
 * Reads every post kind and publishes questions and discussions without requiring course history
 * or following. Reviews publish through ReviewService. Only a question's author chooses its accepted
 * reply, and only administrators lock threads until course moderators exist.
 */
export class PostService {
	private static readonly PAGE_SIZE = 20;

	constructor(
		private readonly posts: PostRepository,
		private readonly replies: ReplyRepository,
		private readonly courses: CourseRepository,
		private readonly events: ContentEventPublisher
	) {}

	/** Returns null when the course doesn't exist or the id is malformed. */
	async listPosts(
		courseId: string,
		query: unknown,
		actor: ApplicationUser | null
	): Promise<PostListResponse | null> {
		AccessPolicy.requireAdmittedUser(actor);
		const { kind, filter, after } = postListQuerySchema.parse(query);
		const course = await this.findCourseSpace(courseId);
		if (!course) return null;

		const orderedBy: PostOrderField = filter === 'active' ? 'lastActivityAt' : 'createdAt';
		const pageSize = PostService.PAGE_SIZE;
		const posts = await this.posts.findPage(
			{
				spaceId: course.spaceId,
				kinds: kind ? [kind] : POST_KINDS,
				orderedBy,
				onlyWithoutReplies: filter === 'unanswered',
				after: after ? PostService.parseCursor(after) : null
			},
			pageSize + 1
		);
		const page = posts.slice(0, pageSize);
		const lastPost = page.at(-1);
		return {
			posts: page.map(PostResponseMapper.toSummaryResponse),
			nextCursor:
				lastPost && posts.length > pageSize
					? `${lastPost[orderedBy].getTime()}_${lastPost._id.toHexString()}`
					: null
		};
	}

	async createPost(
		courseId: string,
		input: unknown,
		actor: ApplicationUser | null
	): Promise<PostCreationResult> {
		const author = AccessPolicy.requireOnboardedUser(actor);
		const request = createPostSchema.parse(input);
		const course = await this.findCourseSpace(courseId);
		if (!course) return { kind: 'course-not-found' };

		const now = new Date();
		const post: PostDocument = {
			_id: new ObjectId(),
			spaceId: course.spaceId,
			courseId: course.courseId,
			kind: request.kind,
			authorId: new ObjectId(author.id),
			title: request.title,
			bodyMarkdown: request.bodyMarkdown,
			replyCount: 0,
			acceptedReplyId: null,
			lockedAt: null,
			createdAt: now,
			lastActivityAt: now,
			state: 'published'
		};
		await this.posts.insert(post);
		this.events.publishPostCreated(
			{
				courseId: post.courseId.toHexString(),
				postId: post._id.toHexString(),
				kind: post.kind
			},
			author.id
		);
		const { username, displayName } = author.profile;
		return {
			kind: 'created',
			post: PostResponseMapper.toDetailResponse(
				{ ...post, author: { username, displayName } },
				author
			)
		};
	}

	/** Returns null when the post doesn't exist or the id is malformed. */
	async getPost(postId: string, actor: ApplicationUser | null): Promise<PostDetailResponse | null> {
		const viewer = AccessPolicy.requireAdmittedUser(actor);
		const post = await this.findPost(postId);
		return post ? PostResponseMapper.toDetailResponse(post, viewer) : null;
	}

	async chooseAcceptedReply(
		postId: string,
		input: unknown,
		actor: ApplicationUser | null
	): Promise<AcceptedReplyChangeResult> {
		const { replyId } = acceptReplySchema.parse(input);
		return this.changeAcceptedReply(postId, new ObjectId(replyId), actor);
	}

	async clearAcceptedReply(
		postId: string,
		actor: ApplicationUser | null
	): Promise<AcceptedReplyChangeResult> {
		return this.changeAcceptedReply(postId, null, actor);
	}

	/** Locking stops new replies. Returns null when the post doesn't exist. */
	async setLocked(
		postId: string,
		isLocked: boolean,
		actor: ApplicationUser | null
	): Promise<PostDetailResponse | null> {
		const administrator = AccessPolicy.requireAdministrator(actor);
		const post = await this.findPost(postId);
		if (!post) return null;
		// Locking again keeps the original time.
		const lockedAt = isLocked ? (post.lockedAt ?? new Date()) : null;
		if (!(await this.posts.setLockedAt(post._id, lockedAt))) return null;
		return PostResponseMapper.toDetailResponse({ ...post, lockedAt }, administrator);
	}

	private async changeAcceptedReply(
		postId: string,
		replyId: ObjectId | null,
		actor: ApplicationUser | null
	): Promise<AcceptedReplyChangeResult> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const post = await this.findPost(postId);
		if (!post) return { kind: 'post-not-found' };
		if (post.kind !== 'question') return { kind: 'not-a-question' };
		if (post.authorId.toHexString() !== user.id) {
			throw new AccessDeniedError(
				'forbidden',
				'Only the person who asked can choose the accepted reply.'
			);
		}
		if (replyId) {
			const placement = await this.replies.findPlacement(replyId);
			if (!placement?.postId.equals(post._id)) return { kind: 'reply-not-found' };
		}
		if (!(await this.posts.setAcceptedReply(post._id, post.authorId, replyId))) {
			return { kind: 'post-not-found' };
		}
		return {
			kind: 'changed',
			post: PostResponseMapper.toDetailResponse({ ...post, acceptedReplyId: replyId }, user)
		};
	}

	private async findPost(postId: string): Promise<PostDetail | null> {
		const parsedPostId = postIdSchema.safeParse(postId);
		return parsedPostId.success ? this.posts.findById(new ObjectId(parsedPostId.data)) : null;
	}

	private async findCourseSpace(
		courseId: string
	): Promise<{ courseId: ObjectId; spaceId: ObjectId } | null> {
		const parsedCourseId = courseIdSchema.safeParse(courseId);
		if (!parsedCourseId.success) return null;
		const courseObjectId = new ObjectId(parsedCourseId.data);
		const spaceId = await this.courses.findSpaceId(courseObjectId);
		return spaceId ? { courseId: courseObjectId, spaceId } : null;
	}

	private static parseCursor(cursor: string): PostPagePosition {
		const [orderedAtMilliseconds, postId] = cursor.split('_');
		return { orderedAt: new Date(Number(orderedAtMilliseconds)), postId: new ObjectId(postId) };
	}
}

export const postService = new PostService(
	postRepository,
	replyRepository,
	courseRepository,
	contentEventPublisher
);
