/** What a composer had in it, as kept between visits. Replies leave the title empty. */
export interface StoredComposerDraft {
	title: string;
	bodyMarkdown: string;
}

/** Something a draft is written for: a thread, one reply branch, or a new post in a channel. */
export class ComposerDraftTarget {
	private constructor(readonly key: string) {}

	static threadReply(postId: string): ComposerDraftTarget {
		return new ComposerDraftTarget(`reply:${postId}`);
	}

	static branchReply(postId: string, parentReplyId: string): ComposerDraftTarget {
		return new ComposerDraftTarget(`reply:${postId}:${parentReplyId}`);
	}

	static newPost(courseId: string, threadKind: string): ComposerDraftTarget {
		return new ComposerDraftTarget(`post:${courseId}:${threadKind}`);
	}
}

const STORAGE_KEY_PREFIX = 'courseboard:composer-draft:';

function isBlank(draft: StoredComposerDraft): boolean {
	return draft.title.trim() === '' && draft.bodyMarkdown.trim() === '';
}

function parseStoredDraft(serializedDraft: string | null): StoredComposerDraft | null {
	if (serializedDraft === null) return null;
	try {
		const parsed: unknown = JSON.parse(serializedDraft);
		if (typeof parsed !== 'object' || parsed === null) return null;
		const { title, bodyMarkdown } = parsed as Record<string, unknown>;
		if (typeof title !== 'string' || typeof bodyMarkdown !== 'string') return null;
		return { title, bodyMarkdown };
	} catch {
		return null;
	}
}

function resolveBrowserStorage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/**
 * Drafts in the browser's local storage, keyed by account and target. Storage can be missing, full,
 * or blocked, so every call swallows the failure: a draft then lasts only as long as the page.
 */
export class ComposerDraftStorage {
	constructor(private readonly resolveStorage: () => Storage | null = resolveBrowserStorage) {}

	read(accountId: string, target: ComposerDraftTarget): StoredComposerDraft | null {
		return this.attempt(null, (storage) =>
			parseStoredDraft(storage.getItem(this.storageKey(accountId, target)))
		);
	}

	/** Saves the draft, or forgets it once it's blank. */
	write(accountId: string, target: ComposerDraftTarget, draft: StoredComposerDraft): void {
		this.attempt(undefined, (storage) => {
			const storageKey = this.storageKey(accountId, target);
			if (isBlank(draft)) storage.removeItem(storageKey);
			else storage.setItem(storageKey, JSON.stringify(draft));
		});
	}

	/** Saves the draft only if nothing is saved for the target yet. */
	writeIfAbsent(accountId: string, target: ComposerDraftTarget, draft: StoredComposerDraft): void {
		if (this.read(accountId, target) === null) this.write(accountId, target, draft);
	}

	/** Forgets the draft only if it still matches, so text typed since then is kept. */
	removeIfUnchanged(
		accountId: string,
		target: ComposerDraftTarget,
		draft: StoredComposerDraft
	): void {
		const storedDraft = this.read(accountId, target);
		if (storedDraft?.title === draft.title && storedDraft.bodyMarkdown === draft.bodyMarkdown) {
			this.write(accountId, target, { title: '', bodyMarkdown: '' });
		}
	}

	/** Forgets every draft except the given account's; null forgets them all. */
	removeAllExcept(accountId: string | null): void {
		this.attempt(undefined, (storage) => {
			const keptPrefix = accountId === null ? null : `${STORAGE_KEY_PREFIX}${accountId}:`;
			const storageKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
			for (const storageKey of storageKeys) {
				if (!storageKey?.startsWith(STORAGE_KEY_PREFIX)) continue;
				if (keptPrefix !== null && storageKey.startsWith(keptPrefix)) continue;
				storage.removeItem(storageKey);
			}
		});
	}

	private storageKey(accountId: string, target: ComposerDraftTarget): string {
		return `${STORAGE_KEY_PREFIX}${accountId}:${target.key}`;
	}

	private attempt<T>(fallback: T, operation: (storage: Storage) => T): T {
		try {
			const storage = this.resolveStorage();
			return storage ? operation(storage) : fallback;
		} catch {
			return fallback;
		}
	}
}
