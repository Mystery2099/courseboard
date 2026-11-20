import { z } from 'zod';

/**
 * The fixed set people react with, stored as stable keys; the client chooses how each looks.
 * Reactions never sort, rank, or filter anything, and review threads don't take them.
 */
export const REACTION_EMOJIS = [
	'thumbs-up',
	'heart',
	'laugh',
	'celebrate',
	'thinking',
	'thanks'
] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const reactionEmojiSchema = z.enum(REACTION_EMOJIS);

export interface ReactionCountResponse {
	emoji: ReactionEmoji;
	/** At least 1; emoji nobody used are left out. */
	count: number;
	reactedByViewer: boolean;
}

/** Every reaction in one thread, each list in `REACTION_EMOJIS` order. */
export interface ThreadReactionsResponse {
	/** Reactions on the post itself. */
	post: ReactionCountResponse[];
	/** Keyed by reply id; replies without reactions are left out. */
	replies: Record<string, ReactionCountResponse[]>;
}

export type ThreadReactionsResult =
	| { kind: 'found'; reactions: ThreadReactionsResponse }
	| { kind: 'post-not-found' }
	| { kind: 'reactions-not-allowed' };

/** Adding a reaction that already exists, or removing one that doesn't, counts as `saved`. */
export type ReactionChangeResult =
	| { kind: 'saved' }
	| { kind: 'post-not-found' }
	| { kind: 'reply-not-found' }
	| { kind: 'reactions-not-allowed' };
