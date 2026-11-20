import { tick } from 'svelte';

/** Shows announced posts or replies on request, for a `NewActivityNotice`. */
export class NewActivityReveal {
	isShowing = $state(false);

	/**
	 * Loads the new items, then moves focus to the first one shown, since the notice disappears.
	 * `findFirstShownElementId` runs once the list has rendered them.
	 */
	async reveal(load: () => Promise<unknown>, findFirstShownElementId: () => string | undefined) {
		this.isShowing = true;
		try {
			await load();
		} finally {
			this.isShowing = false;
		}
		await tick();
		const elementId = findFirstShownElementId();
		if (elementId) document.getElementById(elementId)?.focus();
	}
}
