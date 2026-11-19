import { ApiRequestError } from '#lib/client/ApiRequest.ts';
import { describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
import { m } from '#lib/paraglide/messages.js';
import type { ReplyResponse } from '#lib/contracts/PostContract.ts';
import { PostApiClient } from './PostApiClient.ts';

export interface PendingReply {
	submissionId: string;
	parentReplyId: string | null;
	bodyMarkdown: string;
	status: 'sending' | 'failed';
	errorMessage: string | null;
}

/** Hears how each queued reply ends up. */
export interface ReplySubmissionListener {
	onStored(pendingReply: PendingReply): void;
	/** A refusal, such as a locked thread, means the page is out of date. */
	onFailed(pendingReply: PendingReply, wasRefused: boolean): void;
	onDiscarded(pendingReply: PendingReply): void;
}

/**
 * Replies on their way to the server. Each keeps one submission id for its whole life, so Retry
 * after a lost response gets the stored reply back instead of writing a second one. A failed reply
 * keeps its text until it is retried or discarded.
 */
export class ReplySubmissionQueue {
	pendingReplies = $state<PendingReply[]>([]);
	/** Stored replies the thread's loaded pages may not include yet. */
	storedReplies = $state<ReplyResponse[]>([]);

	constructor(
		private readonly postId: string,
		private readonly listener: ReplySubmissionListener
	) {}

	/** Queues a reply and returns its submission id. */
	submit(bodyMarkdown: string, parentReplyId: string | null): string {
		const submissionId = crypto.randomUUID();
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
		const pendingReply = this.find(submissionId);
		if (!pendingReply || pendingReply.status === 'sending') return;
		this.remove(submissionId);
		this.listener.onDiscarded(pendingReply);
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
			this.remove(submissionId);
			this.listener.onStored(pendingReply);
		} catch (cause) {
			pendingReply.status = 'failed';
			pendingReply.errorMessage = describeRequestFailure(cause, m.error_unavailable);
			this.listener.onFailed(
				pendingReply,
				cause instanceof ApiRequestError && cause.status === 409
			);
		}
	}

	private remove(submissionId: string): void {
		this.pendingReplies = this.pendingReplies.filter(
			(pendingReply) => pendingReply.submissionId !== submissionId
		);
	}

	private find(submissionId: string): PendingReply | undefined {
		return this.pendingReplies.find((pendingReply) => pendingReply.submissionId === submissionId);
	}
}
