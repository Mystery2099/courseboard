import { MongoServerError, ObjectId } from 'mongodb';
import {
	createReplySchema,
	postIdSchema,
	replyListQuerySchema,
	type ReplyCreationResult,
	type ReplyListResponse,
	type ReplyResponse
} from '#lib/contracts/PostContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { postRepository, type PostRepository } from './PostRepository.ts';
import type { ReplyDocument, ReplyWithAuthor } from './Reply.ts';
import { replyRepository, type ReplyRepository } from './ReplyRepository.ts';

const DUPLICATE_KEY_ERROR_CODE = 11000;

/** Replies to questions and discussions, nested one level at most. */
export class ReplyService {
	private static readonly PAGE_SIZE = 30;

	constructor(
		private readonly replies: ReplyRepository,
		private readonly posts: PostRepository
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
		const id = new ObjectId(parsedPostId.data);
		if (!(await this.posts.exists(id))) return null;

		const pageSize = ReplyService.PAGE_SIZE;
		const replies = await this.replies.findPage(
			id,
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
		const id = new ObjectId(parsedPostId.data);
		const authorId = new ObjectId(author.id);

		const storedEarlier = await this.replies.findBySubmission(authorId, request.submissionId);
		if (storedEarlier) return { kind: 'created', reply: ReplyService.toResponse(storedEarlier) };

		const post = await this.posts.findById(id);
		if (!post) return { kind: 'post-not-found' };
		if (post.lockedAt) return { kind: 'post-locked' };

		const parentReplyId = request.parentReplyId ? new ObjectId(request.parentReplyId) : null;
		if (parentReplyId) {
			const parent = await this.replies.findPlacement(parentReplyId);
			if (!parent?.postId.equals(id) || parent.parentReplyId) {
				return { kind: 'parent-reply-unavailable' };
			}
		}

		const reply: ReplyDocument = {
			_id: new ObjectId(),
			postId: id,
			parentReplyId,
			authorId,
			bodyMarkdown: request.bodyMarkdown,
			submissionId: request.submissionId,
			createdAt: new Date()
		};
		// The unique submission index must exist before it can stop a duplicate.
		await DatabaseIndexInitializer.ensureIndexes();
		const session = mongoClientProvider.startSession();
		try {
			const wasStored = await session.withTransaction(async () => {
				if (!(await this.posts.recordReply(id, reply.createdAt, session))) return false;
				await this.replies.insert(reply, session);
				return true;
			});
			// The post was locked or removed after the check above.
			if (!wasStored) return { kind: 'post-locked' };
		} catch (cause) {
			if (!(cause instanceof MongoServerError) || cause.code !== DUPLICATE_KEY_ERROR_CODE) {
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
		const { username, displayName } = author.profile;
		return {
			kind: 'created',
			reply: ReplyService.toResponse({ ...reply, author: { username, displayName } })
		};
	}

	private static toResponse(reply: ReplyWithAuthor): ReplyResponse {
		return {
			id: reply._id.toHexString(),
			postId: reply.postId.toHexString(),
			parentReplyId: reply.parentReplyId?.toHexString() ?? null,
			author: reply.author,
			bodyMarkdown: reply.bodyMarkdown,
			createdAt: reply.createdAt.toISOString()
		};
	}
}

export const replyService = new ReplyService(replyRepository, postRepository);
