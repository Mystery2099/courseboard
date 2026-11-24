import { error } from '@sveltejs/kit';
import type {
	LinkedReplyResponse,
	PostDetailResponse,
	PostListResponse,
	ReplyListResponse,
	PostKind
} from '#lib/contracts/PostContract.ts';
import type { ThreadReactionsResponse } from '#lib/contracts/ReactionContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { postService } from '#lib/server/content/PostService.ts';
import { reactionService } from '#lib/server/content/ReactionService.ts';
import { replyService } from '#lib/server/content/ReplyService.ts';

export interface PostListPageData {
	postPage: PostListResponse;
	postPageLoadedAt: number;
}

export interface ThreadPageData {
	post: PostDetailResponse;
	replies: ReplyListResponse;
	/** The reply the address links to, which may be past the first page; null without one. */
	linkedReply: LinkedReplyResponse | null;
	/** Null on a review thread, which takes no reactions. */
	reactions: ThreadReactionsResponse | null;
	threadLoadedAt: number;
}

/** Server loads shared by the course channel pages, which differ only in the kind they show. */
export class CoursePostPageLoader {
	/** The first page of a channel's posts; a null kind is the overview. */
	static async loadPostList(
		locals: App.Locals,
		courseId: string,
		kind: PostKind | null
	): Promise<PostListPageData> {
		const user = AccessGuard.requireAdmittedUser(locals);
		const postPage = await postService.listPosts(courseId, kind ? { kind } : {}, user);
		if (!postPage) error(404, 'This course does not exist.', { code: 'course-not-found' });
		return { postPage, postPageLoadedAt: Date.now() };
	}

	/**
	 * A thread opened under another course or the other channel doesn't exist at that address. A
	 * linked reply that isn't in the thread is left out, and the thread opens without it.
	 */
	static async loadThread(
		locals: App.Locals,
		params: { courseId: string; postId: string },
		kind: PostKind,
		linkedReplyId: string | null
	): Promise<ThreadPageData> {
		const user = AccessGuard.requireAdmittedUser(locals);
		const [post, replies, reactions, linkedReply] = await Promise.all([
			postService.getPost(params.postId, user),
			replyService.listReplies(params.postId, {}, user),
			reactionService.listThreadReactions(params.postId, user),
			linkedReplyId ? replyService.findLinkedReply(params.postId, linkedReplyId, user) : null
		]);
		if (!post || !replies || post.courseId !== params.courseId || post.kind !== kind) {
			error(404, 'This post does not exist.', { code: 'post-not-found' });
		}
		return {
			post,
			replies,
			linkedReply,
			reactions: reactions.kind === 'found' ? reactions.reactions : null,
			threadLoadedAt: Date.now()
		};
	}
}
