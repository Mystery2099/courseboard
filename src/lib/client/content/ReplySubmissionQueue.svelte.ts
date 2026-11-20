import { ApiRequestError } from '#lib/client/ApiRequest.ts';
import { describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
import { m } from '#lib/paraglide/messages.js';
import type { ReplyResponse } from '#lib/contracts/PostContract.ts';
import { PostApiClient } from './PostApiClient.ts';
import type { UnconfirmedReplyStorage } from './UnconfirmedReplyStorage.ts';

export interface PendingReply {
	submissionId: string;
	parentReplyId: string | null;
	bodyMarkdown: string;
	status: 'sending' | 'failed';
	errorMessage: string | null;
}

/**
 * Replies on their way to the server. Each keeps one submission id for its whole life, so Retry
 * after a lost response gets the stored reply back instead of writing a second one. A failed reply
 * keeps its text until it is retried or discarded. Until the server confirms a reply it is also
 * kept in local storage, and sent again when the thread is next opened.
 */
export class ReplySubmissionQueue {
	pendingReplies = $state<PendingReply[]>([]);
	/** Stored replies the thread's loaded pages may not include yet. */
	storedReplies = $state<ReplyResponse[]>([]);

	constructor(
		private readonly postId: string,
		private readonly unconfirmedReplies: UnconfirmedReplyStorage,
		private readonly onStored: () => void,
		private readonly onRefused: () => void
	) {}

	/**
	 * Sends replies an earlier visit left unconfirmed again. Their submission ids are unchanged, so one
	 * the server already stored comes back instead of being written twice. A reply the server refused
	 * comes back as failed, waiting for Retry or Discard.
	 */
	restoreUnconfirmed(): void {
		for (const reply of this.unconfirmedReplies.loadAll()) {
			if (this.find(reply.submissionId)) continue;
			const { refusalMessage, ...pendingFields } = reply;
			this.pendingReplies.push({
				...pendingFields,
				status: refusalMessage === null ? 'sending' : 'failed',
				errorMessage: refusalMessage
			});
			if (refusalMessage === null) void this.send(reply.submissionId);
		}
	}

	/** Queues a reply and returns its submission id. */
	submit(bodyMarkdown: string, parentReplyId: string | null): string {
		const submissionId = crypto.randomUUID();
		this.unconfirmedReplies.save({
			submissionId,
			parentReplyId,
			bodyMarkdown,
			refusalMessage: null
		});
		this.pendingReplies.push({
			submissionId,
			parentReplyId,
			bodyMarkdown,
			status: 'sending',
			errorMessage: null
		});
		void this.send(submissionId);
		return submissionId;
	}

	retry(submissionId: string): void {
		const pendingReply = this.find(submissionId);
		if (!pendingReply || pendingReply.status === 'sending') return;
		pendingReply.status = 'sending';
		pendingReply.errorMessage = null;
		void this.send(submissionId);
	}

	discard(submissionId: string): void {
		this.unconfirmedReplies.remove(submissionId);
		this.pendingReplies = this.pendingReplies.filter(
			(pendingReply) => pendingReply.submissionId !== submissionId
		);
	}

	private async send(submissionId: string): Promise<void> {
		const pendingReply = this.find(submissionId);
		if (!pendingReply) return;
		try {
			const reply = await PostApiClient.createReply(this.postId, {
				bodyMarkdown: pendingReply.bodyMarkdown,
				parentReplyId: pendingReply.parentReplyId,
				submissionId
			});
			this.storedReplies.push(reply);
			this.discard(submissionId);
			this.onStored();
		} catch (cause) {
			pendingReply.status = 'failed';
			pendingReply.errorMessage = describeRequestFailure(cause, m.error_unavailable);
			// A refusal, unlike a lost connection, isn't sent again on its own the next visit.
			if (cause instanceof ApiRequestError && cause.status < 500) {
				this.unconfirmedReplies.save({
					submissionId,
					parentReplyId: pendingReply.parentReplyId,
					bodyMarkdown: pendingReply.bodyMarkdown,
					refusalMessage: pendingReply.errorMessage
				});
			}
			// A refusal such as a locked thread means the page is out of date.
			if (cause instanceof ApiRequestError && cause.status === 409) this.onRefused();
		}
	}

	private find(submissionId: string): PendingReply | undefined {
		return this.pendingReplies.find((pendingReply) => pendingReply.submissionId === submissionId);
	}
}
