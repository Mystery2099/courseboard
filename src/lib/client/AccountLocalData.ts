import { createContext } from 'svelte';
import { AccountLocalStorage } from './AccountLocalStorage.ts';
import { ComposerDrafts } from './content/ComposerDrafts.svelte.ts';
import { UnconfirmedReplyStorage } from './content/UnconfirmedReplyStorage.ts';

/** What the browser keeps locally for the signed-in account. One per tab, shared through context. */
export class AccountLocalData {
	readonly composerDrafts: ComposerDrafts;

	constructor(
		private readonly resolveAccountId: () => string | null,
		private readonly storage = new AccountLocalStorage()
	) {
		this.composerDrafts = new ComposerDrafts(storage, resolveAccountId);
	}

	/** Bound to the account signed in now, so a late response can't write under another account. */
	unconfirmedReplies(postId: string): UnconfirmedReplyStorage {
		return new UnconfirmedReplyStorage(this.storage, this.resolveAccountId(), postId);
	}

	/** Removes other accounts' data, and everything once signed out. */
	keepOnlyAccount(accountId: string | null): void {
		this.storage.removeAllExcept(accountId);
	}
}

export const [getAccountLocalData, setAccountLocalData] = createContext<AccountLocalData>();
