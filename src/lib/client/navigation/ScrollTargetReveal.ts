const HIGHLIGHT_DURATION_MS = 2000;
const HIGHLIGHT_ATTRIBUTE = 'data-scroll-highlight';

/** Brings a part of the page into view and marks it briefly, so the reader sees where they landed. */
export class ScrollTargetReveal {
	private static highlightedElement: HTMLElement | null = null;
	private static highlightTimer: ReturnType<typeof setTimeout> | undefined;

	/** Smooth scrolling, unless the reader prefers reduced motion. */
	static scrollBehavior(): ScrollBehavior {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
	}

	/**
	 * Scrolls the element into view, clear of the page's scroll padding and so of the phone's reply
	 * bar, then highlights it. With `moveFocus`, focus moves there too, so screen readers continue
	 * from it; the element needs a `tabindex`.
	 */
	static reveal(element: HTMLElement, { moveFocus }: { moveFocus: boolean }): void {
		if (moveFocus) element.focus({ preventScroll: true });
		const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
		// A tall element is shown from its start, rather than centered with its start cut off.
		element.scrollIntoView({
			block: element.offsetHeight > visibleHeight / 2 ? 'start' : 'center',
			behavior: ScrollTargetReveal.scrollBehavior()
		});
		ScrollTargetReveal.highlight(element);
	}

	/** The bottom of the area the page isn't covering, in window coordinates. */
	static visibleAreaBottom(): number {
		const scrollPaddingBottom =
			parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0;
		return window.innerHeight - scrollPaddingBottom;
	}

	private static highlight(element: HTMLElement): void {
		clearTimeout(ScrollTargetReveal.highlightTimer);
		ScrollTargetReveal.highlightedElement?.removeAttribute(HIGHLIGHT_ATTRIBUTE);
		// Read layout in between, so highlighting the same element again restarts its animation.
		void element.offsetWidth;
		element.setAttribute(HIGHLIGHT_ATTRIBUTE, '');
		ScrollTargetReveal.highlightedElement = element;
		ScrollTargetReveal.highlightTimer = setTimeout(() => {
			element.removeAttribute(HIGHLIGHT_ATTRIBUTE);
			ScrollTargetReveal.highlightedElement = null;
		}, HIGHLIGHT_DURATION_MS);
	}
}
