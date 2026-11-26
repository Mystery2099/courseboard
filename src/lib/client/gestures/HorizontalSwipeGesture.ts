import type { Attachment } from 'svelte/attachments';

const MINIMUM_SWIPE_DISTANCE_PIXELS = 44;
/** How much longer the sideways travel must be than the vertical travel. */
const HORIZONTAL_DOMINANCE_RATIO = 1.5;
/** How long after lifting the finger the browser may still send that touch's click. */
const TRAILING_CLICK_MILLISECONDS = 400;

export type SwipeDirection = 'left' | 'right';

/** The direction of a finished touch, or null when it was too short or mostly vertical. */
export function classifySwipe(deltaX: number, deltaY: number): SwipeDirection | null {
	const horizontalDistance = Math.abs(deltaX);
	if (horizontalDistance < MINIMUM_SWIPE_DISTANCE_PIXELS) return null;
	if (horizontalDistance < Math.abs(deltaY) * HORIZONTAL_DOMINANCE_RATIO) return null;
	return deltaX < 0 ? 'left' : 'right';
}

/**
 * Calls `onSwipe` when one finger slides sideways across the element and lifts. Mouse and pen are
 * ignored. The element needs `touch-action: pan-y pinch-zoom`, so the browser still scrolls and zooms,
 * and cancels the touch when it does.
 */
export function horizontalSwipe(
	onSwipe: (direction: SwipeDirection) => void
): Attachment<HTMLElement> {
	return (element) => {
		let swipePointerId: number | null = null;
		let startX = 0;
		let startY = 0;
		let swipeEndedAt: number | null = null;

		function stopTracking() {
			swipePointerId = null;
			document.removeEventListener('pointerdown', cancelOnSecondFinger, true);
		}

		// A second finger anywhere on the page means a pinch, not a swipe.
		function cancelOnSecondFinger(event: PointerEvent) {
			if (event.pointerType === 'touch' && event.pointerId !== swipePointerId) stopTracking();
		}

		function startSwipe(event: PointerEvent) {
			swipeEndedAt = null;
			if (!event.isPrimary || event.pointerType !== 'touch') return;
			swipePointerId = event.pointerId;
			startX = event.clientX;
			startY = event.clientY;
			document.addEventListener('pointerdown', cancelOnSecondFinger, true);
		}

		function cancelSwipe(event: PointerEvent) {
			if (event.pointerId === swipePointerId) stopTracking();
		}

		function endSwipe(event: PointerEvent) {
			if (event.pointerId !== swipePointerId) return;
			stopTracking();
			const direction = classifySwipe(event.clientX - startX, event.clientY - startY);
			if (!direction) return;
			swipeEndedAt = event.timeStamp;
			onSwipe(direction);
		}

		// The lifted finger can still click the element, which would also run its tap action.
		function suppressTrailingClick(event: MouseEvent) {
			// Keyboard activation reports no clicks and always goes through.
			if (swipeEndedAt === null || event.detail === 0) return;
			const isTrailingClick = event.timeStamp - swipeEndedAt <= TRAILING_CLICK_MILLISECONDS;
			swipeEndedAt = null;
			if (!isTrailingClick) return;
			event.preventDefault();
			event.stopImmediatePropagation();
		}

		const listeners = new AbortController();
		const { signal } = listeners;
		element.addEventListener('pointerdown', startSwipe, { signal });
		element.addEventListener('pointerup', endSwipe, { signal });
		element.addEventListener('pointercancel', cancelSwipe, { signal });
		element.addEventListener('click', suppressTrailingClick, { capture: true, signal });
		return () => {
			stopTracking();
			listeners.abort();
		};
	};
}
