import { createContext, untrack } from 'svelte';

/** Lets a thread's reply bar take the phone dock's place while the bar is on the page. */
export class PhoneDock {
	private replyBarCount = $state(0);

	get isReplacedByReplyBar(): boolean {
		return this.replyBarCount > 0;
	}

	/** Hides the dock until the returned function is called, when the bar leaves the page. */
	replaceWithReplyBar(): () => void {
		// Untracked, so an effect that calls this doesn't rerun on the count it changes.
		untrack(() => this.replyBarCount++);
		return () => untrack(() => this.replyBarCount--);
	}
}

export const [getPhoneDock, setPhoneDock] = createContext<PhoneDock>();
