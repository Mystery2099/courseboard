import type { ObjectId } from 'mongodb';
import type { ReactionEmoji } from '#lib/contracts/ReactionContract.ts';

export const REACTIONS_COLLECTION_NAME = 'reactions';

/**
 * One person's use of one emoji on a post or reply. Counts are never stored on posts or replies,
 * so nothing that lists or ranks posts can read them.
 */
export interface ReactionDocument {
	_id: ObjectId;
	postId: ObjectId;
	/** Always present: null for the post itself, since a unique index tells a missing field from null. */
	replyId: ObjectId | null;
	userId: ObjectId;
	emoji: ReactionEmoji;
	createdAt: Date;
}

/** What a reaction is on: the post itself when `replyId` is null. */
export type ReactionTarget = Pick<ReactionDocument, 'postId' | 'replyId'>;

export interface ReactionCount {
	replyId: ObjectId | null;
	emoji: ReactionEmoji;
	count: number;
	reactedByViewer: boolean;
}
