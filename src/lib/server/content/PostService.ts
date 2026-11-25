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
	type PostListResponse,
	type ReviewListOrder
} from '#lib/contracts/PostContract.ts';
import { courseIdSchema } from '#lib/contracts/CourseCatalogContract.ts';
import { AccessDeniedError, AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import {
	contentEventPublisher,
	type ContentEventPublisher
} from '#lib/server/realtime/ContentEventPublisher.ts';
import { mentionService, type MentionService } from '#lib/server/mentions/MentionService.ts';
import { TimestampIdCursor } from '#lib/server/persistence/TimestampIdCursor.ts';
import {
	courseModerationAccess,
	type CourseModerationAccess
} from '#lib/server/moderation/CourseModerationAccess.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type {
	PostDetail,
	PostDocument,
	PostOrderField,
	PostPagePosition,
	ReviewPageCriteria
} from './Post.ts';
import { postRepository, type PostRepository } from './PostRepository.ts';
import { PostResponseMapper } from './PostResponseMapper.ts';
import { replyRepository, type ReplyRepository } from './ReplyRepository.ts';
import { ReviewPageCursor } from './ReviewPageCursor.ts';
import { reviewRepository, type ReviewRepository } from './ReviewRepository.ts';

/**
 * Reads every post kind and publishes questions and discussions without requiring course history
 * or following. Reviews publish through ReviewService. Only a question's author chooses its accepted
 * reply. The course's moderators and administrators lock threads.
 */
export class PostService {
	private static readonly PAGE_SIZE = 20;

	constructor(
		private readonly posts: PostRepository,
		private readonly replies: ReplyRepository,
		private readonly reviews: ReviewRepository,
		private readonly courses: CourseRepository,
		private readonly events: ContentEventPublisher,
		private readonly moderation: CourseModerationAccess,
		private readonly mentions: MentionService
	) {}

	/** Returns null when the course doesn't exist or the id is malformed. */
	async listPosts(
		courseId: string,
		query: unknown,
		actor: ApplicationUser | null
	): Promise<PostListResponse | null> {
		AccessPolicy.requireAdmittedUser(actor);
		const { kind, filter, workload, wouldTakeAgain, after } = postListQuerySchema.parse(query);
		const course = await this.findCourseSpace(courseId);
		if (!course) return null;
		if (kind === 'review') {
			// The schema allows `unanswered` only with questions.
			const order = filter as ReviewListOrder;
			return this.listReviews({
				courseId: course.courseId,
				order,
				workload: workload ?? null,
				wouldTakeAgain: wouldTakeAgain === undefined ? null : wouldTakeAgain === 'yes',
				after: after ? ReviewPageCursor.parse(order, after) : null
			});
		}

		const orderedBy: PostOrderField = filter === 'active' ? 'lastActivityAt' : 'createdAt';
		const pageSize = PostService.PAGE_SIZE;
		const posts = await this.posts.findPage(
			{
				spaceId: course.spaceId,
				kinds: kind ? [kind] : POST_KINDS,
				orderedBy,
				onlyWithoutReplies: filter === 'unanswered',
				after: after ? PostService.toPagePosition(after) : null
			},
			pageSize + 1
		);
		const page = posts.slice(0, pageSize);
		const lastPost = page.at(-1);
		return {
			posts: page.map(PostResponseMapper.toSummaryResponse),
			nextCursor:
				lastPost && posts.length > pageSize
					? TimestampIdCursor.format(lastPost[orderedBy], lastPost._id)
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
		// Read before the insert, so a failed lookup can't fail a saved post and invite a duplicate retry.
		const authorCanModerate = await this.moderation.canModerate(author, course.courseId);
		const mentioned = await this.mentions.resolveMentions(request.bodyMarkdown, author);

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
			state: 'published',
			...(mentioned.length > 0 && { mentions: mentioned })
		};
		await this.posts.insert(post);
		const courseIdText = post.courseId.toHexString();
		const postIdText = post._id.toHexString();
		this.events.publishPostCreated(
			{ courseId: courseIdText, postId: postIdText, kind: post.kind },
			author.id
		);
		this.mentions.announceMentions(
			mentioned,
			{ courseId: courseIdText, postId: postIdText, postKind: post.kind, replyId: null },
			author.id
		);
		const { username, displayName } = author.profile;
		return {
			kind: 'created',
			post: PostResponseMapper.toDetailResponse(
				{ ...post, author: { username, displayName } },
				author,
				authorCanModerate
			)
		};
	}

	/** Returns null when the post doesn't exist or the id is malformed. */
	async getPost(postId: string, actor: ApplicationUser | null): Promise<PostDetailResponse | null> {
		const viewer = AccessPolicy.requireAdmittedUser(actor);
		const post = await this.findPost(postId);
		if (!post) return null;
		return PostResponseMapper.toDetailResponse(
			post,
			viewer,
			await this.moderation.canModerate(viewer, post.courseId)
		);
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
		const moderator = AccessPolicy.requireAdmittedUser(actor);
		const post = await this.findPost(postId);
		if (!post) return null;
		await this.moderation.requireModerator(moderator, post.courseId);
		const wasLocked = post.lockedAt !== null;
		// Locking again keeps the original time.
		const lockedAt = isLocked ? (post.lockedAt ?? new Date()) : null;
		if (!(await this.posts.setLockedAt(post._id, lockedAt))) return null;
		if (isLocked !== wasLocked) {
			this.events.publishPostLockChanged({
				courseId: post.courseId.toHexString(),
				postId: post._id.toHexString()
			});
		}
		return PostResponseMapper.toDetailResponse({ ...post, lockedAt }, moderator, true);
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
			post: PostResponseMapper.toDetailResponse(
				{ ...post, acceptedReplyId: replyId },
				user,
				await this.moderation.canModerate(user, post.courseId)
			)
		};
	}

	private async listReviews(criteria: ReviewPageCriteria): Promise<PostListResponse> {
		const pageSize = PostService.PAGE_SIZE;
		const reviews = await this.reviews.findPage(criteria, pageSize + 1);
		const page = reviews.slice(0, pageSize);
		const lastReview = page.at(-1);
		return {
			posts: page.map(PostResponseMapper.toSummaryResponse),
			nextCursor:
				lastReview && reviews.length > pageSize
					? ReviewPageCursor.format(criteria.order, lastReview)
					: null
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

	private static toPagePosition(cursor: string): PostPagePosition {
		const { at, id } = TimestampIdCursor.parse(cursor);
		return { orderedAt: at, postId: id };
	}
}

export const postService = new PostService(
	postRepository,
	replyRepository,
	reviewRepository,
	courseRepository,
	contentEventPublisher,
	courseModerationAccess,
	mentionService
);
