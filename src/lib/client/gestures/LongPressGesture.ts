import type { Attachment } from 'svelte/attachments';

const LONG_PRESS_DELAY_MILLISECONDS = 500;
const MOVEMENT_TOLERANCE_PIXELS = 10;
/** How long after lifting the finger the browser may still send that touch's click. */
const TRAILING_CLICK_MILLISECONDS = 400;
/** Controls keep their own press behavior, such as opening a link's menu. */
const INTERACTIVE_ELEMENTS = 'a, button, input, textarea, select, summary, iframe, video, audio';

/**
 * Calls `onLongPress` when one finger rests on the element without moving. Mouse and pen presses
 * are ignored, since those have a visible button for the same thing.
 */
export function longPress(onLongPress: (element: HTMLElement) => void): Attachment<HTMLElement> {
	return (element) => {
		let pressTimer: ReturnType<typeof setTimeout> | undefined;
		let pressPointerId: number | null = null;
		let startX = 0;
		let startY = 0;
		let hasFired = false;
		let firedPressEndedAt = 0;

		function cancelPress() {
			clearTimeout(pressTimer);
			pressTimer = undefined;
		}

		function startPress(event: PointerEvent) {
			// A second finger means a pinch, not a press.
			if (!event.isPrimary) return cancelPress();
			hasFired = false;
			if (event.pointerType !== 'touch') return;
			if ((event.target as Element).closest(INTERACTIVE_ELEMENTS)) return;
			pressPointerId = event.pointerId;
			startX = event.clientX;
			startY = event.clientY;
			pressTimer = setTimeout(() => {
				pressTimer = undefined;
				hasFired = true;
				onLongPress(element);
			}, LONG_PRESS_DELAY_MILLISECONDS);
		}

		function trackMovement(event: PointerEvent) {
			if (pressTimer === undefined || event.pointerId !== pressPointerId) return;
			const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
			if (distance > MOVEMENT_TOLERANCE_PIXELS) cancelPress();
		}

		function endPress(event: PointerEvent) {
			if (event.pointerId !== pressPointerId) return;
			cancelPress();
			pressPointerId = null;
			if (hasFired) firedPressEndedAt = event.timeStamp;
		}

		// Android raises its own long-press menu and text selection at about the same moment.
		function suppressBrowserMenu(event: Event) {
			if (pressPointerId !== null && (pressTimer !== undefined || hasFired)) event.preventDefault();
		}

		// Lifting the finger can still click whatever is under it once the sheet has opened.
		function suppressTrailingClick(event: MouseEvent) {
			if (!hasFired || event.timeStamp - firedPressEndedAt > TRAILING_CLICK_MILLISECONDS) return;
			hasFired = false;
			event.preventDefault();
			event.stopPropagation();
		}

		element.addEventListener('pointerdown', startPress);
		element.addEventListener('pointermove', trackMovement);
		element.addEventListener('pointerup', endPress);
		element.addEventListener('pointercancel', endPress);
		element.addEventListener('contextmenu', suppressBrowserMenu);
		element.addEventListener('click', suppressTrailingClick, true);
		return () => {
			cancelPress();
			element.removeEventListener('pointerdown', startPress);
			element.removeEventListener('pointermove', trackMovement);
			element.removeEventListener('pointerup', endPress);
			element.removeEventListener('pointercancel', endPress);
			element.removeEventListener('contextmenu', suppressBrowserMenu);
			element.removeEventListener('click', suppressTrailingClick, true);
		};
	};
}
