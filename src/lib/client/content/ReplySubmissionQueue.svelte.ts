import { ApiRequestError } from '#lib/client/ApiRequest.ts';
import type { ReplyResponse } from '#lib/contracts/PostContract.ts';
import { PostApiClient } from './PostApiClient.ts';

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
 * keeps its text until it is retried or discarded.
 */
export class ReplySubmissionQueue {
	pendingReplies = $state<PendingReply[]>([]);
	/** Stored replies the thread's loaded pages may not include yet. */
	storedReplies = $state<ReplyResponse[]>([]);

	constructor(
		private readonly postId: string,
		private readonly onStored: () => void,
		private readonly onRefused: () => void
	) {}

	submit(bodyMarkdown: string, parentReplyId: string | null): void {
		const submissionId = crypto.randomUUID();
		this.pendingReplies.push({
			submissionId,
			parentReplyId,
			bodyMarkdown,
			status: 'sending',
			errorMessage: null
		});
		void this.send(submissionId);
	}

	retry(submissionId: string): void {
		const pendingReply = this.find(submissionId);
		if (!pendingReply || pendingReply.status === 'sending') return;
		pendingReply.status = 'sending';
		pendingReply.errorMessage = null;
		void this.send(submissionId);
	}

	discard(submissionId: string): void {
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
			pendingReply.errorMessage =
				cause instanceof ApiRequestError ? cause.message : "Couldn't send. Check your connection.";
			// A refusal such as a locked thread means the page is out of date.
			if (cause instanceof ApiRequestError && cause.status === 409) this.onRefused();
		}
	}

	private find(submissionId: string): PendingReply | undefined {
		return this.pendingReplies.find((pendingReply) => pendingReply.submissionId === submissionId);
	}
}
