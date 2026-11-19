import type { AccountLocalStorage } from '#lib/client/AccountLocalStorage.ts';

/** What a composer holds. Replies leave the title empty. */
export interface ComposerDraftText {
	title: string;
	bodyMarkdown: string;
}

/** Something a draft is written for: a thread, one reply branch, or a new post in a channel. */
export class ComposerDraftTarget {
	private constructor(readonly key: string) {}

	static threadReply(postId: string): ComposerDraftTarget {
		return new ComposerDraftTarget(`draft:reply:${postId}`);
	}

	static branchReply(postId: string, parentReplyId: string): ComposerDraftTarget {
		return new ComposerDraftTarget(`draft:reply:${postId}:${parentReplyId}`);
	}

	static newPost(courseId: string, threadKind: string): ComposerDraftTarget {
		return new ComposerDraftTarget(`draft:post:${courseId}:${threadKind}`);
	}
}

function parseDraftText(value: unknown): ComposerDraftText | null {
	if (typeof value !== 'object' || value === null) return null;
	const { title, bodyMarkdown } = value as Record<string, unknown>;
	if (typeof title !== 'string' || typeof bodyMarkdown !== 'string') return null;
	return { title, bodyMarkdown };
}

/**
 * A composer's text, saved on every change so it survives leaving the page or the browser closing
 * a background tab. Without an account, or when storage fails, it lasts as long as the tab.
 */
export class ComposerDraft {
	private titleText = $state('');
	private bodyMarkdownText = $state('');

	constructor(
		private readonly storage: AccountLocalStorage,
		private readonly accountId: string | null,
		private readonly target: ComposerDraftTarget
	) {
		const storedText = accountId ? parseDraftText(storage.read(accountId, target.key)) : null;
		this.titleText = storedText?.title ?? '';
		this.bodyMarkdownText = storedText?.bodyMarkdown ?? '';
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

	/** Clears the draft unless it was edited after the text was sent. */
	clearIfUnchanged(sentText: ComposerDraftText): void {
		if (this.titleText === sentText.title && this.bodyMarkdownText === sentText.bodyMarkdown) {
			this.clear();
		}
	}

	private save(): void {
		if (this.accountId === null) return;
		if (this.titleText.trim() === '' && this.bodyMarkdownText.trim() === '') {
			this.storage.remove(this.accountId, this.target.key);
		} else {
			this.storage.write(this.accountId, this.target.key, {
				title: this.titleText,
				bodyMarkdown: this.bodyMarkdownText
			});
		}
	}
}

/**
 * Opens the signed-in account's drafts. Opening the same target again returns the same draft, so
 * every composer for it shows the same text and nothing typed is lost if storage fails.
 */
export class ComposerDrafts {
	private openDrafts: Record<string, ComposerDraft> = {};
	private openDraftsAccountId: string | null = null;

	constructor(
		private readonly storage: AccountLocalStorage,
		private readonly resolveAccountId: () => string | null
	) {}

	/** Reads the account reactively, so a derived that opens a draft reopens it for a new account. */
	open(target: ComposerDraftTarget): ComposerDraft {
		const accountId = this.resolveAccountId();
		if (accountId !== this.openDraftsAccountId) {
			this.openDrafts = {};
			this.openDraftsAccountId = accountId;
		}
		this.openDrafts[target.key] ??= new ComposerDraft(this.storage, accountId, target);
		return this.openDrafts[target.key];
	}
}
