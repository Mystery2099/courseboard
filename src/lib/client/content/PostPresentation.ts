import type { PostListFilter, ReplyResponse, ThreadKind } from '#lib/contracts/PostContract.ts';

export const THREAD_KIND_LABELS: Record<ThreadKind, string> = {
	question: 'Question',
	discussion: 'Discussion'
};

export const POST_LIST_FILTER_LABELS: Record<PostListFilter, string> = {
	active: 'Active',
	newest: 'Newest',
	unanswered: 'Unanswered'
};

export function formatReplyCount(replyCount: number): string {
	return replyCount === 1 ? '1 reply' : `${replyCount} replies`;
}

const RELATIVE_TIME_STEPS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
	{ unit: 'year', seconds: 365 * 86_400 },
	{ unit: 'month', seconds: 30 * 86_400 },
	{ unit: 'day', seconds: 86_400 },
	{ unit: 'hour', seconds: 3_600 },
	{ unit: 'minute', seconds: 60 }
];

const relativeTimeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 hours ago", in the largest unit that fits. */
export function formatRelativeTime(isoDate: string, now = Date.now()): string {
	const elapsedSeconds = Math.max(0, (now - new Date(isoDate).getTime()) / 1000);
	const step = RELATIVE_TIME_STEPS.find((candidate) => elapsedSeconds >= candidate.seconds);
	if (!step) return 'just now';
	return relativeTimeFormat.format(-Math.floor(elapsedSeconds / step.seconds), step.unit);
}

export interface ReplyBranch {
	reply: ReplyResponse;
	nestedReplies: ReplyResponse[];
}

/** Groups a chronological reply list into top-level replies with their nested replies. */
export function groupReplies(replies: ReplyResponse[]): ReplyBranch[] {
	const branches = new Map<string, ReplyBranch>();
	for (const reply of replies) {
		if (reply.parentReplyId === null) {
			branches.set(reply.id, { reply, nestedReplies: [] });
		} else {
			branches.get(reply.parentReplyId)?.nestedReplies.push(reply);
		}
	}
	return [...branches.values()];
}
