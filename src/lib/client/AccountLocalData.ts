import { createContext } from 'svelte';
import { AccountLocalStorage } from './AccountLocalStorage.ts';
import { ComposerDrafts } from './content/ComposerDrafts.svelte.ts';
import { UnconfirmedReplyStorage } from './content/UnconfirmedReplyStorage.ts';

/** What the browser keeps locally for the signed-in account. One per tab, shared through context. */
export class AccountLocalData {
	readonly composerDrafts: ComposerDrafts;

	constructor(
		private readonly resolveAccountId: () => string | null,
		private readonly resolveIsAccountLoaded: () => boolean = () => true,
		private readonly storage = new AccountLocalStorage()
	) {
		this.composerDrafts = new ComposerDrafts(storage, resolveAccountId);
	}

	/** Bound to the account signed in now; it stops writing once that account signs out or switches. */
	unconfirmedReplies(postId: string): UnconfirmedReplyStorage {
		return new UnconfirmedReplyStorage(
			this.storage,
			this.resolveAccountId(),
			postId,
			this.resolveAccountId
		);
	}

	/**
	 * Whether Clerk has loaded and confirmed this account. Until then the account comes from the
	 * server's render, and the session cookie may have changed since in another tab.
	 */
	isConfirmedAccount(accountId: string | null): boolean {
		return (
			accountId !== null && this.resolveIsAccountLoaded() && this.resolveAccountId() === accountId
		);
	}

	/** Removes other accounts' data, and everything once signed out, from storage and memory. */
	keepOnlyAccount(accountId: string | null): void {
		this.storage.removeAllExcept(accountId);
		this.composerDrafts.forgetOpenDraftsUnlessAccount(accountId);
	}
}

export const [getAccountLocalData, setAccountLocalData] = createContext<AccountLocalData>();
