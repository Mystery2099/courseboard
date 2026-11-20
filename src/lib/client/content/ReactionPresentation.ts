import type {
	ReactionCountResponse,
	ReactionEmoji,
	ThreadReactionsResponse
} from '#lib/contracts/ReactionContract.ts';
import { REACTION_EMOJIS } from '#lib/contracts/ReactionContract.ts';
import { m } from '#lib/paraglide/messages.js';

export const REACTION_GLYPHS: Record<ReactionEmoji, string> = {
	'thumbs-up': '👍',
	heart: '❤️',
	laugh: '😂',
	celebrate: '🎉',
	thinking: '🤔',
	thanks: '🙏'
};

export const REACTION_NAMES: Record<ReactionEmoji, () => string> = {
	'thumbs-up': m.reaction_thumbs_up,
	heart: m.reaction_heart,
	laugh: m.reaction_laugh,
	celebrate: m.reaction_celebrate,
	thinking: m.reaction_thinking,
	thanks: m.reaction_thanks
};

/** A reaction toggle the server hasn't confirmed yet. `replyId` is null for the post itself. */
export interface ReactionToggle {
	replyId: string | null;
	emoji: ReactionEmoji;
	isAdding: boolean;
}

/** The viewer's reactions on one target, applied to a copy, so the page shows it before the server answers. */
export function applyReactionToggle(
	reactions: ThreadReactionsResponse,
	{ replyId, emoji, isAdding }: ReactionToggle
): ThreadReactionsResponse {
	const current = replyId === null ? reactions.post : (reactions.replies[replyId] ?? []);
	const existing = current.find((reaction) => reaction.emoji === emoji);
	if ((existing?.reactedByViewer ?? false) === isAdding) return reactions;

	const count = (existing?.count ?? 0) + (isAdding ? 1 : -1);
	const others = current.filter((reaction) => reaction.emoji !== emoji);
	const updated: ReactionCountResponse[] = (
		count > 0 ? [...others, { emoji, count, reactedByViewer: isAdding }] : others
	).toSorted(
		(first, second) => REACTION_EMOJIS.indexOf(first.emoji) - REACTION_EMOJIS.indexOf(second.emoji)
	);
	return replyId === null
		? { ...reactions, post: updated }
		: { ...reactions, replies: { ...reactions.replies, [replyId]: updated } };
}
