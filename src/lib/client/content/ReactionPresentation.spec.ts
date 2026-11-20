import { describe, expect, it } from 'vitest';
import type { ThreadReactionsResponse } from '#lib/contracts/ReactionContract.ts';
import { applyReactionToggle } from './ReactionPresentation.ts';

const reactions: ThreadReactionsResponse = {
	post: [{ emoji: 'heart', count: 2, reactedByViewer: false }],
	replies: { reply: [{ emoji: 'thanks', count: 1, reactedByViewer: true }] }
};

describe('applying a reaction toggle', () => {
	it('adds the viewer to a count and keeps the fixed emoji order', () => {
		const added = applyReactionToggle(reactions, {
			replyId: null,
			emoji: 'thumbs-up',
			isAdding: true
		});

		expect(added.post).toEqual([
			{ emoji: 'thumbs-up', count: 1, reactedByViewer: true },
			{ emoji: 'heart', count: 2, reactedByViewer: false }
		]);
	});

	it("drops an emoji when the viewer's reaction was its last", () => {
		const removed = applyReactionToggle(reactions, {
			replyId: 'reply',
			emoji: 'thanks',
			isAdding: false
		});

		expect(removed.replies.reply).toEqual([]);
	});

	it('changes nothing when the viewer already has that state', () => {
		expect(
			applyReactionToggle(reactions, { replyId: 'reply', emoji: 'thanks', isAdding: true })
		).toBe(reactions);
	});
});
