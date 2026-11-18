import { createContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { PostKind } from '#lib/contracts/PostContract.ts';
import type { PostCreatedEvent, ReplyCreatedEvent } from '#lib/contracts/RealtimeContract.ts';

/**
 * New posts and replies announced in the open course. They are held back until the reader asks
 * for them, so arriving content never moves what someone is reading. Counts leave out items the
 * page already shows, so a notice clears itself once a refetch loads its items.
 */
export class CourseActivityNotices {
	private readonly newPostKinds = new SvelteMap<string, PostKind>();
	/** Reply ID to the ID of its post. */
	private readonly newReplyPostIds = new SvelteMap<string, string>();

	recordPost(event: PostCreatedEvent): void {
		this.newPostKinds.set(event.postId, event.kind);
	}

	recordReply(event: ReplyCreatedEvent): void {
		this.newReplyPostIds.set(event.replyId, event.postId);
	}

	/** Null includes every kind, as the course overview lists them all. */
	findNewPostIds(kind: PostKind | null, loadedPostIds: ReadonlySet<string>): string[] {
		return [...this.newPostKinds]
			.filter(
				([postId, postKind]) => (kind === null || postKind === kind) && !loadedPostIds.has(postId)
			)
			.map(([postId]) => postId);
	}

	findNewReplyIds(postId: string, loadedReplyIds: ReadonlySet<string>): string[] {
		return [...this.newReplyPostIds]
			.filter(([replyId, replyPostId]) => replyPostId === postId && !loadedReplyIds.has(replyId))
			.map(([replyId]) => replyId);
	}

	forgetPosts(postIds: Iterable<string>): void {
		for (const postId of postIds) this.newPostKinds.delete(postId);
	}

	clear(): void {
		this.newPostKinds.clear();
		this.newReplyPostIds.clear();
	}
}

export const [getCourseActivityNotices, setCourseActivityNotices] =
	createContext<CourseActivityNotices>();
