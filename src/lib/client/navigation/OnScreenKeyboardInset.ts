import type { Attachment } from 'svelte/attachments';

/**
 * Keeps a bottom-pinned element above the on-screen keyboard. Safari on iOS and Chrome on Android
 * lay the keyboard over the page instead of shrinking it, so `bottom: 0` alone ends up underneath.
 * Sets `--keyboard-inset` on the page to the keyboard's height, so scrolling can clear it too, and
 * `data-keyboard-open` on the element while it shows.
 */
export const stayAboveOnScreenKeyboard: Attachment<HTMLElement> = (element) => {
	const viewport = window.visualViewport;
	if (!viewport) return;
	const root = document.documentElement;
	const update = () => {
		// Pinch zoom shrinks the visual viewport too; only an unzoomed page can mean a keyboard.
		const keyboardInset =
			viewport.scale > 1.01
				? 0
				: Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
		root.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
		element.toggleAttribute('data-keyboard-open', keyboardInset > 0);
	};
	update();
	viewport.addEventListener('resize', update, { passive: true });
	viewport.addEventListener('scroll', update, { passive: true });
	return () => {
		viewport.removeEventListener('resize', update);
		viewport.removeEventListener('scroll', update);
		root.style.removeProperty('--keyboard-inset');
	};
};
