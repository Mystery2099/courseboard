import type { Attachment } from 'svelte/attachments';

const LONG_PRESS_DELAY_MILLISECONDS = 500;
const MOVEMENT_TOLERANCE_PIXELS = 10;
/** Controls keep their own press behavior, such as opening a link's menu. */
const INTERACTIVE_ELEMENTS = 'a, button, input, textarea, select, summary, iframe, video, audio';

/**
 * Calls `onLongPress` when a finger rests on the element without moving. Mouse and pen presses are
 * ignored, since those have a visible button for the same thing.
 */
export function longPress(onLongPress: (element: HTMLElement) => void): Attachment<HTMLElement> {
	return (element) => {
		let pressTimer: ReturnType<typeof setTimeout> | undefined;
		let startX = 0;
		let startY = 0;
		let hasFired = false;

		function cancelPress() {
			clearTimeout(pressTimer);
			pressTimer = undefined;
		}

		function startPress(event: PointerEvent) {
			hasFired = false;
			if (event.pointerType !== 'touch' || !event.isPrimary) return;
			if ((event.target as Element).closest(INTERACTIVE_ELEMENTS)) return;
			startX = event.clientX;
			startY = event.clientY;
			pressTimer = setTimeout(() => {
				pressTimer = undefined;
				hasFired = true;
				onLongPress(element);
			}, LONG_PRESS_DELAY_MILLISECONDS);
		}

		function trackMovement(event: PointerEvent) {
			if (pressTimer === undefined) return;
			const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
			if (distance > MOVEMENT_TOLERANCE_PIXELS) cancelPress();
		}

		// Android raises its own long-press menu and text selection at about the same moment.
		function suppressBrowserMenu(event: Event) {
			if (pressTimer !== undefined || hasFired) event.preventDefault();
		}

		element.addEventListener('pointerdown', startPress);
		element.addEventListener('pointermove', trackMovement);
		element.addEventListener('pointerup', cancelPress);
		element.addEventListener('pointercancel', cancelPress);
		element.addEventListener('contextmenu', suppressBrowserMenu);
		return () => {
			cancelPress();
			element.removeEventListener('pointerdown', startPress);
			element.removeEventListener('pointermove', trackMovement);
			element.removeEventListener('pointerup', cancelPress);
			element.removeEventListener('pointercancel', cancelPress);
			element.removeEventListener('contextmenu', suppressBrowserMenu);
		};
	};
}
