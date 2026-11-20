import { afterEach, expect, it } from 'vitest';
import { NewActivityReveal } from './NewActivityReveal.svelte.ts';

afterEach(() => document.body.replaceChildren());

it('shows progress while loading, focuses the first new item, and stops after a failed load', async () => {
	const reveal = new NewActivityReveal();
	const newReply = Object.assign(document.createElement('article'), {
		id: 'reply-1',
		tabIndex: -1
	});
	document.body.append(newReply);

	let wasShowingDuringLoad = false;
	await reveal.reveal(
		async () => {
			wasShowingDuringLoad = reveal.isShowing;
		},
		() => 'reply-1'
	);
	expect(wasShowingDuringLoad).toBe(true);
	expect(reveal.isShowing).toBe(false);
	expect(document.activeElement).toBe(newReply);

	newReply.blur();
	await expect(
		reveal.reveal(
			() => Promise.reject(new Error('offline')),
			() => 'reply-1'
		)
	).rejects.toThrow('offline');
	expect(reveal.isShowing).toBe(false);
});
