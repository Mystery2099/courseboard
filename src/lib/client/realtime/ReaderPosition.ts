/** How far above the page's end still counts as being there, so a reader a few pixels short isn't left out. */
const PAGE_END_TOLERANCE_PX = 80;

const EDITABLE_SELECTOR =
	'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Where the reader is and what they're doing, for deciding whether new activity can appear directly. */
export class ReaderPosition {
	/**
	 * True when the reader is at the end of the page and reading: the tab is visible, no dialog or
	 * sheet is open, and no text field has focus.
	 */
	static isFollowingPageEnd(): boolean {
		if (document.visibilityState !== 'visible') return false;
		if (document.querySelector('[aria-modal="true"]')) return false;
		if (document.activeElement?.matches(EDITABLE_SELECTOR)) return false;
		const pageHeight = document.documentElement.scrollHeight;
		return window.scrollY + window.innerHeight >= pageHeight - PAGE_END_TOLERANCE_PX;
	}

	/** Scrolls to the end of the page, smoothly unless the reader prefers reduced motion. */
	static scrollToPageEnd(): void {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({
			top: document.documentElement.scrollHeight,
			behavior: prefersReducedMotion ? 'instant' : 'smooth'
		});
	}
}
