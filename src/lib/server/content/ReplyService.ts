import { ObjectId } from 'mongodb';
import { objectIdSchema } from '#lib/contracts/ApiContract.ts';
import {
	createReplySchema,
	postIdSchema,
	replyListQuerySchema,
	type LinkedReplyResponse,
	type ReplyCreationResult,
	type ReplyListResponse,
	type ReplyResponse
} from '#lib/contracts/PostContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { mentionService, type MentionService } from '#lib/server/mentions/MentionService.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { MongoErrorClassifier } from '#lib/server/persistence/MongoErrorClassifier.ts';
import {
	contentEventPublisher,
	type ContentEventPublisher
} from '#lib/server/realtime/ContentEventPublisher.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { postRepository, type PostRepository } from './PostRepository.ts';
import type { ReplyDocument, ReplyWithAuthor } from './Reply.ts';
import { replyRepository, type ReplyRepository } from './ReplyRepository.ts';

/** Replies to questions and discussions, nested one level at most. */
export class ReplyService {
	private static readonly PAGE_SIZE = 30;

	constructor(
		private readonly replies: ReplyRepository,
		private readonly posts: PostRepository,
		private readonly events: ContentEventPublisher,
		private readonly mentions: MentionService
	) {}

	/** Returns null when the post doesn't exist or the id is malformed. */
	async listReplies(
		postId: string,
		query: unknown,
		actor: ApplicationUser | null
	): Promise<ReplyListResponse | null> {
		AccessPolicy.requireAdmittedUser(actor);
		const { after } = replyListQuerySchema.parse(query);
		const parsedPostId = postIdSchema.safeParse(postId);
		if (!parsedPostId.success) return null;
		const postObjectId = new ObjectId(parsedPostId.data);
		if (!(await this.posts.exists(postObjectId))) return null;

		const pageSize = ReplyService.PAGE_SIZE;
		const replies = await this.replies.findPage(
			postObjectId,
			after ? new ObjectId(after) : null,
			pageSize + 1
		);
		const page = replies.slice(0, pageSize);
		const lastReply = page.at(-1);
		return {
			replies: page.map(ReplyService.toResponse),
			nextCursor: lastReply && replies.length > pageSize ? lastReply._id.toHexString() : null
		};
	}

	/**
	 * The reply a link points at and its top-level reply, read by id, so a link opens on a reply
	 * however far into the thread it is. Null when either isn't in this post or an id is malformed.
	 */
	async findLinkedReply(
		postId: string,
		replyId: string,
		actor: ApplicationUser | null
	): Promise<LinkedReplyResponse | null> {
		AccessPolicy.requireAdmittedUser(actor);
		const parsedPostId = postIdSchema.safeParse(postId);
		const parsedReplyId = objectIdSchema.safeParse(replyId);
		if (!parsedPostId.success || !parsedReplyId.success) return null;
		const postObjectId = new ObjectId(parsedPostId.data);
		if (!(await this.posts.exists(postObjectId))) return null;

		const reply = await this.replies.findInPost(postObjectId, new ObjectId(parsedReplyId.data));
		if (!reply) return null;
		if (!reply.parentReplyId) return { reply: ReplyService.toResponse(reply), parentReply: null };
		const parentReply = await this.replies.findInPost(postObjectId, reply.parentReplyId);
		if (!parentReply) return null;
		return {
			reply: ReplyService.toResponse(reply),
			parentReply: ReplyService.toResponse(parentReply)
		};
	}

	/**
	 * Stores the reply and counts it on the post in one transaction, so the count and the thread's
	 * activity never disagree with the stored replies. A submission that was already stored is
	 * returned again instead of being written twice.
	 */
	async createReply(
		postId: string,
		input: unknown,
		actor: ApplicationUser | null
	): Promise<ReplyCreationResult> {
		const author = AccessPolicy.requireOnboardedUser(actor);
		const request = createReplySchema.parse(input);
		const parsedPostId = postIdSchema.safeParse(postId);
		if (!parsedPostId.success) return { kind: 'post-not-found' };
		const postObjectId = new ObjectId(parsedPostId.data);
		const authorId = new ObjectId(author.id);

		const storedEarlier = await this.replies.findBySubmission(authorId, request.submissionId);
		if (storedEarlier) return { kind: 'created', reply: ReplyService.toResponse(storedEarlier) };

		const post = await this.posts.findById(postObjectId);
		if (!post) return { kind: 'post-not-found' };
		if (post.lockedAt) return this.refuseLockedUnlessStored(authorId, request.submissionId);

		const parentReplyId = request.parentReplyId ? new ObjectId(request.parentReplyId) : null;
		if (parentReplyId) {
			const parent = await this.replies.findPlacement(parentReplyId);
			if (!parent?.postId.equals(postObjectId) || parent.parentReplyId) {
				return { kind: 'parent-reply-unavailable' };
			}
		}

		const mentioned = await this.mentions.resolveMentions(request.bodyMarkdown, author);
		const reply: ReplyDocument = {
			_id: new ObjectId(),
			postId: postObjectId,
			parentReplyId,
			authorId,
			bodyMarkdown: request.bodyMarkdown,
			submissionId: request.submissionId,
			createdAt: new Date(),
			...(mentioned.length > 0 && { mentions: mentioned })
		};
		// The unique submission index must exist before it can stop a duplicate.
		await DatabaseIndexInitializer.ensureIndexes();
		const session = mongoClientProvider.startSession();
		try {
			const wasStored = await session.withTransaction(async () => {
				if (!(await this.posts.recordReply(postObjectId, reply.createdAt, session))) return false;
				await this.replies.insert(reply, session);
				return true;
			});
			// The post was locked or removed after the check above.
			if (!wasStored) return this.refuseLockedUnlessStored(authorId, request.submissionId);
		} catch (cause) {
			if (!MongoErrorClassifier.isDuplicateKeyError(cause)) {
				throw cause;
			}
			// The same submission arrived twice at once; the other request stored it.
			const storedConcurrently = await this.replies.findBySubmission(
				authorId,
				request.submissionId
			);
			if (!storedConcurrently) throw cause;
			return { kind: 'created', reply: ReplyService.toResponse(storedConcurrently) };
		} finally {
			await session.endSession();
		}
		// Only a new insert is announced; the paths above that return a stored reply already were.
		const event = {
			courseId: post.courseId.toHexString(),
			postId: post._id.toHexString(),
			replyId: reply._id.toHexString()
		};
		this.events.publishReplyCreated(event, author.id);
		this.mentions.announceMentions(mentioned, { ...event, postKind: post.kind }, author.id);
		const { username, displayName } = author.profile;
		return {
			kind: 'created',
			reply: ReplyService.toResponse({ ...reply, author: { username, displayName } })
		};
	}

	/**
	 * A concurrent request with the same submission may have stored the reply just before the lock,
	 * so look once more before telling the client it wasn't sent.
	 */
	private async refuseLockedUnlessStored(
		authorId: ObjectId,
		submissionId: string
	): Promise<ReplyCreationResult> {
		const stored = await this.replies.findBySubmission(authorId, submissionId);
		return stored
			? { kind: 'created', reply: ReplyService.toResponse(stored) }
			: { kind: 'post-locked' };
	}

	private static toResponse(reply: ReplyWithAuthor): ReplyResponse {
		return {
			id: reply._id.toHexString(),
			postId: reply.postId.toHexString(),
			parentReplyId: reply.parentReplyId?.toHexString() ?? null,
			author: reply.author,
			bodyMarkdown: reply.bodyMarkdown,
			mentionedUsernames: (reply.mentions ?? []).map((mentioned) => mentioned.username),
			createdAt: reply.createdAt.toISOString()
		};
	}
}

export const replyService = new ReplyService(
	replyRepository,
	postRepository,
	contentEventPublisher,
	mentionService
);
