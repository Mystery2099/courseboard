import type { AccountLocalStorage } from '#lib/client/AccountLocalStorage.ts';

/** A reply handed to the server that it hasn't confirmed storing yet. */
export interface UnconfirmedReply {
	submissionId: string;
	parentReplyId: string | null;
	bodyMarkdown: string;
}

function parseUnconfirmedReply(value: unknown): UnconfirmedReply | null {
	if (typeof value !== 'object' || value === null) return null;
	const { submissionId, parentReplyId, bodyMarkdown } = value as Record<string, unknown>;
	if (typeof submissionId !== 'string' || typeof bodyMarkdown !== 'string') return null;
	if (parentReplyId !== null && typeof parentReplyId !== 'string') return null;
	return { submissionId, parentReplyId, bodyMarkdown };
}

/**
 * Keeps a thread's unconfirmed replies with their submission ids, so a reply whose page was left
 * or closed comes back with a Retry that can't store it twice. Fixed to the account that sent them.
 */
export class UnconfirmedReplyStorage {
	constructor(
		private readonly storage: AccountLocalStorage,
		private readonly accountId: string | null,
		private readonly postId: string,
		private readonly resolveCurrentAccountId: () => string | null
	) {}

	loadAll(): UnconfirmedReply[] {
		if (this.accountId === null) return [];
		return this.storage
			.readAll(this.accountId, this.keyPrefix())
			.map(parseUnconfirmedReply)
			.filter((reply) => reply !== null);
	}

	save(reply: UnconfirmedReply): void {
		const accountId = this.currentBoundAccountId();
		if (accountId === null) return;
		this.storage.write(accountId, this.keyPrefix() + reply.submissionId, {
			submissionId: reply.submissionId,
			parentReplyId: reply.parentReplyId,
			bodyMarkdown: reply.bodyMarkdown
		});
	}

	remove(submissionId: string): void {
		const accountId = this.currentBoundAccountId();
		if (accountId === null) return;
		this.storage.remove(accountId, this.keyPrefix() + submissionId);
	}

	/** Null after a sign-out or switch, when writing would recreate data that was just removed. */
	private currentBoundAccountId(): string | null {
		return this.accountId === this.resolveCurrentAccountId() ? this.accountId : null;
	}

	private keyPrefix(): string {
		return `unconfirmed-reply:${this.postId}:`;
	}
}
