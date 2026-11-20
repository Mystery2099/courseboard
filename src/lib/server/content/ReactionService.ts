import { ObjectId } from 'mongodb';
import { objectIdSchema } from '#lib/contracts/ApiContract.ts';
import { postIdSchema } from '#lib/contracts/PostContract.ts';
import {
	REACTION_EMOJIS,
	reactionEmojiSchema,
	type ReactionChangeResult,
	type ReactionCountResponse,
	type ThreadReactionsResponse,
	type ThreadReactionsResult
} from '#lib/contracts/ReactionContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import {
	contentEventPublisher,
	type ContentEventPublisher
} from '#lib/server/realtime/ContentEventPublisher.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { postRepository, type PostRepository } from './PostRepository.ts';
import type { ReactionCount, ReactionTarget } from './Reaction.ts';
import { reactionRepository, type ReactionRepository } from './ReactionRepository.ts';
import { replyRepository, type ReplyRepository } from './ReplyRepository.ts';

type ResolvedTarget =
	| { kind: 'found'; target: ReactionTarget; courseId: ObjectId }
	| Exclude<ReactionChangeResult, { kind: 'saved' }>;

/**
 * Reactions on questions, discussions, and their replies. A review thread takes none, on the
 * review or its replies, so a reaction can't read as agreement with a rating. Locking a thread
 * stops replies only. Counts are worked out when a thread is read and feed nothing else.
 */
export class ReactionService {
	constructor(
		private readonly reactions: ReactionRepository,
		private readonly posts: PostRepository,
		private readonly replies: ReplyRepository,
		private readonly events: ContentEventPublisher
	) {}

	async listThreadReactions(
		postId: string,
		actor: ApplicationUser | null
	): Promise<ThreadReactionsResult> {
		const viewer = AccessPolicy.requireAdmittedUser(actor);
		const parsedPostId = postIdSchema.safeParse(postId);
		if (!parsedPostId.success) return { kind: 'post-not-found' };
		const postObjectId = new ObjectId(parsedPostId.data);
		const post = await this.posts.findKindAndCourse(postObjectId);
		if (!post) return { kind: 'post-not-found' };
		if (post.kind === 'review') return { kind: 'reactions-not-allowed' };
		const counts = await this.reactions.countForThread(postObjectId, new ObjectId(viewer.id));
		return { kind: 'found', reactions: ReactionService.toResponse(counts) };
	}

	/** `replyId` is null for a reaction on the post itself. Repeating it changes nothing. */
	async addReaction(
		postId: string,
		replyId: string | null,
		emoji: string,
		actor: ApplicationUser | null
	): Promise<ReactionChangeResult> {
		const user = AccessPolicy.requireOnboardedUser(actor);
		const parsedEmoji = reactionEmojiSchema.parse(emoji);
		const resolved = await this.resolveTarget(postId, replyId);
		if (resolved.kind !== 'found') return resolved;
		// The unique index must exist before it can stop a second copy.
		await DatabaseIndexInitializer.ensureIndexes();
		const wasAdded = await this.reactions.insert({
			_id: new ObjectId(),
			...resolved.target,
			userId: new ObjectId(user.id),
			emoji: parsedEmoji,
			createdAt: new Date()
		});
		if (wasAdded) this.announceChange(resolved);
		return { kind: 'saved' };
	}

	/** Removing a reaction that isn't there changes nothing. */
	async removeReaction(
		postId: string,
		replyId: string | null,
		emoji: string,
		actor: ApplicationUser | null
	): Promise<ReactionChangeResult> {
		const user = AccessPolicy.requireOnboardedUser(actor);
		const parsedEmoji = reactionEmojiSchema.parse(emoji);
		const resolved = await this.resolveTarget(postId, replyId);
		if (resolved.kind !== 'found') return resolved;
		const wasRemoved = await this.reactions.delete(
			resolved.target,
			new ObjectId(user.id),
			parsedEmoji
		);
		if (wasRemoved) this.announceChange(resolved);
		return { kind: 'saved' };
	}

	private async resolveTarget(postId: string, replyId: string | null): Promise<ResolvedTarget> {
		const parsedPostId = postIdSchema.safeParse(postId);
		if (!parsedPostId.success) return { kind: 'post-not-found' };
		const postObjectId = new ObjectId(parsedPostId.data);
		const post = await this.posts.findKindAndCourse(postObjectId);
		if (!post) return { kind: 'post-not-found' };
		if (post.kind === 'review') return { kind: 'reactions-not-allowed' };
		if (replyId === null) {
			return {
				kind: 'found',
				target: { postId: postObjectId, replyId: null },
				courseId: post.courseId
			};
		}
		const parsedReplyId = objectIdSchema.safeParse(replyId);
		if (!parsedReplyId.success) return { kind: 'reply-not-found' };
		const replyObjectId = new ObjectId(parsedReplyId.data);
		const placement = await this.replies.findPlacement(replyObjectId);
		if (!placement?.postId.equals(postObjectId)) return { kind: 'reply-not-found' };
		return {
			kind: 'found',
			target: { postId: postObjectId, replyId: replyObjectId },
			courseId: post.courseId
		};
	}

	private announceChange(resolved: Extract<ResolvedTarget, { kind: 'found' }>): void {
		this.events.publishReactionChanged({
			courseId: resolved.courseId.toHexString(),
			postId: resolved.target.postId.toHexString()
		});
	}

	private static toResponse(counts: ReactionCount[]): ThreadReactionsResponse {
		const response: ThreadReactionsResponse = { post: [], replies: {} };
		const sortedCounts = counts.toSorted(
			(first, second) =>
				REACTION_EMOJIS.indexOf(first.emoji) - REACTION_EMOJIS.indexOf(second.emoji)
		);
		for (const { replyId, emoji, count, reactedByViewer } of sortedCounts) {
			const reaction: ReactionCountResponse = { emoji, count, reactedByViewer };
			if (replyId === null) {
				response.post.push(reaction);
			} else {
				(response.replies[replyId.toHexString()] ??= []).push(reaction);
			}
		}
		return response;
	}
}

export const reactionService = new ReactionService(
	reactionRepository,
	postRepository,
	replyRepository,
	contentEventPublisher
);
