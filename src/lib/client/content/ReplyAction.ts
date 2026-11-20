import type Check from 'lucide-svelte/icons/check';

/** Every Lucide icon shares this component type. */
export type ReplyActionIcon = typeof Check;

/**
 * One entry in a reply's action menu. The phone sheet and the desktop dropdown list the same
 * actions, so a new one, such as reporting or copying a link, only needs adding to that list.
 */
export interface ReplyAction {
	id: string;
	label: string;
	icon: ReplyActionIcon;
	disabled?: boolean;
	/** Runs while the menu is still open, so browser features that need a tap, such as the clipboard, work. */
	run: () => void;
	/**
	 * Moves focus out of the menu as it closes, such as into the reply field. The sheet closes
	 * during the tap, so a phone keyboard opens. Without it, focus goes back to where it was before.
	 */
	moveFocus?: () => void;
}

/** Remembers the action chosen from an open menu, so the menu can hand focus to it as it closes. */
export class ChosenReplyAction {
	#action: ReplyAction | null = null;

	choose(action: ReplyAction) {
		this.#action = action;
		action.run();
	}

	/**
	 * Call from the menu's `onCloseAutoFocus`. Focus goes where the chosen action sends it, else to
	 * `opener` when given, else back to where it was before the menu opened.
	 */
	handleCloseAutoFocus(event: Event, opener?: HTMLElement | null) {
		const action = this.#action;
		this.#action = null;
		if (action?.moveFocus) {
			event.preventDefault();
			action.moveFocus();
		} else if (opener?.isConnected) {
			event.preventDefault();
			opener.focus();
		}
	}
}
