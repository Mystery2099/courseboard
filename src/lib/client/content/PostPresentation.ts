import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { PostKind, PostListFilter, ReplyResponse } from '#lib/contracts/PostContract.ts';

export const THREAD_KIND_LABELS: Record<PostKind, () => string> = {
	question: m.thread_kind_question,
	discussion: m.thread_kind_discussion,
	review: m.thread_kind_review
};

export const POST_LIST_FILTER_LABELS: Record<PostListFilter, () => string> = {
	active: m.post_list_filter_active,
	newest: m.post_list_filter_newest,
	unanswered: m.post_list_filter_unanswered
};

export function formatReplyCount(replyCount: number): string {
	return m.post_reply_count({ count: replyCount });
}

const RELATIVE_TIME_STEPS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
	{ unit: 'year', seconds: 365 * 86_400 },
	{ unit: 'month', seconds: 30 * 86_400 },
	{ unit: 'day', seconds: 86_400 },
	{ unit: 'hour', seconds: 3_600 },
	{ unit: 'minute', seconds: 60 }
];

/** "3 hours ago", in the largest unit that fits. */
export function formatRelativeTime(isoDate: string, now = Date.now()): string {
	const elapsedSeconds = Math.max(0, (now - new Date(isoDate).getTime()) / 1000);
	const step = RELATIVE_TIME_STEPS.find((candidate) => elapsedSeconds >= candidate.seconds);
	if (!step) return m.relative_time_just_now();
	const relativeTimeFormat = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
	return relativeTimeFormat.format(-Math.floor(elapsedSeconds / step.seconds), step.unit);
}

export interface ReplyBranch {
	reply: ReplyResponse;
	nestedReplies: ReplyResponse[];
}

/**
 * Groups a reply list into top-level replies with their nested replies. Parents are collected
 * first: replies are ordered by ObjectId, and ids written by different server processes within one
 * second can put a nested reply just ahead of its parent.
 */
export function groupReplies(replies: ReplyResponse[]): ReplyBranch[] {
	const branches = new Map<string, ReplyBranch>();
	for (const reply of replies) {
		if (reply.parentReplyId === null) branches.set(reply.id, { reply, nestedReplies: [] });
	}
	for (const reply of replies) {
		if (reply.parentReplyId !== null) branches.get(reply.parentReplyId)?.nestedReplies.push(reply);
	}
	return [...branches.values()];
}
