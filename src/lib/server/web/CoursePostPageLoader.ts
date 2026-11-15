import { error } from '@sveltejs/kit';
import type {
	PostDetailResponse,
	PostListResponse,
	ReplyListResponse,
	PostKind
} from '#lib/contracts/PostContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { postService } from '#lib/server/content/PostService.ts';
import { replyService } from '#lib/server/content/ReplyService.ts';

export interface PostListPageData {
	postPage: PostListResponse;
	postPageLoadedAt: number;
}

export interface ThreadPageData {
	post: PostDetailResponse;
	replies: ReplyListResponse;
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
		if (!postPage) error(404, 'This course does not exist.');
		return { postPage, postPageLoadedAt: Date.now() };
	}

	/** A thread opened under another course or the other channel doesn't exist at that address. */
	static async loadThread(
		locals: App.Locals,
		params: { courseId: string; postId: string },
		kind: PostKind
	): Promise<ThreadPageData> {
		const user = AccessGuard.requireAdmittedUser(locals);
		const [post, replies] = await Promise.all([
			postService.getPost(params.postId, user),
			replyService.listReplies(params.postId, {}, user)
		]);
		if (!post || !replies || post.courseId !== params.courseId || post.kind !== kind) {
			error(404, 'This post does not exist.');
		}
		return { post, replies, threadLoadedAt: Date.now() };
	}
}
