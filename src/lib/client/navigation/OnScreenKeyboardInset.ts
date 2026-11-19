import type { Attachment } from 'svelte/attachments';

/**
 * Keeps a bottom-pinned element above the on-screen keyboard. Safari on iOS and Chrome on Android
 * lay the keyboard over the page instead of shrinking it, so `bottom: 0` alone ends up underneath.
 * Sets `--keyboard-inset` to the keyboard's height and `data-keyboard-open` while it shows.
 */
export const stayAboveOnScreenKeyboard: Attachment<HTMLElement> = (element) => {
	const viewport = window.visualViewport;
	if (!viewport) return;
	const update = () => {
		const keyboardInset = Math.max(
			0,
			Math.round(window.innerHeight - viewport.height - viewport.offsetTop)
		);
		element.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
		element.toggleAttribute('data-keyboard-open', keyboardInset > 0);
	};
	update();
	viewport.addEventListener('resize', update);
	viewport.addEventListener('scroll', update);
	return () => {
		viewport.removeEventListener('resize', update);
		viewport.removeEventListener('scroll', update);
	};
};
