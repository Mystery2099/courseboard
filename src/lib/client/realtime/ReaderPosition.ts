/** How far above the page's end still counts as being there, so a reader a few pixels short isn't left out. */
const PAGE_END_TOLERANCE_PX = 80;

const EDITABLE_SELECTOR =
	'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Where the reader is and what they're doing, for deciding whether new activity can appear directly. */
export class ReaderPosition {
	/** True when the reader is reading and at the end of the page. */
	static isFollowingPageEnd(): boolean {
		return (
			ReaderPosition.isReading() &&
			ReaderPosition.isNearPageEnd(document.documentElement.scrollHeight)
		);
	}

	/**
	 * True when the tab is visible, no dialog or sheet is open, and focus is in neither a text field
	 * nor a new activity notice, which would disappear from under it.
	 */
	static isReading(): boolean {
		const focusedElement = document.activeElement;
		return (
			document.visibilityState === 'visible' &&
			!document.querySelector('[aria-modal="true"]') &&
			!focusedElement?.matches(EDITABLE_SELECTOR) &&
			!focusedElement?.closest('[data-new-activity-notice]')
		);
	}

	/** True when the bottom of the window is near the end of a page of the given height. */
	static isNearPageEnd(pageHeight: number): boolean {
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
