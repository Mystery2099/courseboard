import { createContext } from 'svelte';
import {
	ComposerDraftStorage,
	type ComposerDraftTarget,
	type StoredComposerDraft
} from './ComposerDraftStorage.ts';

/**
 * A composer's text, saved on every change so it survives leaving the page or the browser closing
 * a background tab. Without an account it is kept in memory only.
 */
export class ComposerDraft {
	private titleText = $state('');
	private bodyMarkdownText = $state('');

	constructor(
		private readonly storage: ComposerDraftStorage,
		private readonly accountId: string | null,
		private readonly target: ComposerDraftTarget
	) {
		const storedDraft = accountId ? storage.read(accountId, target) : null;
		this.titleText = storedDraft?.title ?? '';
		this.bodyMarkdownText = storedDraft?.bodyMarkdown ?? '';
	}

	get title(): string {
		return this.titleText;
	}

	set title(title: string) {
		this.titleText = title;
		this.save();
	}

	get bodyMarkdown(): string {
		return this.bodyMarkdownText;
	}

	set bodyMarkdown(bodyMarkdown: string) {
		this.bodyMarkdownText = bodyMarkdown;
		this.save();
	}

	clear(): void {
		this.titleText = '';
		this.bodyMarkdownText = '';
		this.save();
	}

	private save(): void {
		if (this.accountId === null) return;
		this.storage.write(this.accountId, this.target, {
			title: this.titleText,
			bodyMarkdown: this.bodyMarkdownText
		});
	}
}

/** Opens drafts for the signed-in account. Pages share one per tab through context. */
export class ComposerDrafts {
	constructor(
		private readonly resolveAccountId: () => string | null,
		private readonly storage = new ComposerDraftStorage()
	) {}

	/** Reactive on the account, so a draft opened in a derived reopens when the account changes. */
	open(target: ComposerDraftTarget): ComposerDraft {
		return new ComposerDraft(this.storage, this.resolveAccountId(), target);
	}

	/**
	 * Keeps text whose send failed, unless something newer is saved for the target, so it comes back
	 * in the composer after the page is left.
	 */
	keepUnsent(target: ComposerDraftTarget, draft: StoredComposerDraft): void {
		const accountId = this.resolveAccountId();
		if (accountId !== null) this.storage.writeIfAbsent(accountId, target, draft);
	}

	/** Forgets text kept by keepUnsent once it is stored or discarded. */
	forgetUnsent(target: ComposerDraftTarget, draft: StoredComposerDraft): void {
		const accountId = this.resolveAccountId();
		if (accountId !== null) this.storage.removeIfUnchanged(accountId, target, draft);
	}

	/** Forgets other accounts' drafts, and every draft once signed out. */
	keepOnlyAccount(accountId: string | null): void {
		this.storage.removeAllExcept(accountId);
	}
}

export const [getComposerDrafts, setComposerDrafts] = createContext<ComposerDrafts>();
