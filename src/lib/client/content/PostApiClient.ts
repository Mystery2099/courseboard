import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type {
	CreatePostRequest,
	CreateReplyRequest,
	PostDetailResponse,
	PostListFilter,
	PostListResponse,
	ReplyListResponse,
	ReplyResponse,
	ThreadKind
} from '#lib/contracts/PostContract.ts';

/** Every key starts with `posts`, so one invalidation refreshes lists, threads, and replies. */
export const postQueryKeys = {
	all: ['posts'] as const,
	lists: (courseId: string) => [...postQueryKeys.all, 'list', courseId] as const,
	/** A null kind is the course overview, which lists every kind. */
	list: (courseId: string, kind: ThreadKind | null, filter: PostListFilter) =>
		[...postQueryKeys.lists(courseId), kind ?? 'all', filter] as const,
	detail: (postId: string) => [...postQueryKeys.all, 'detail', postId] as const,
	replies: (postId: string) => [...postQueryKeys.all, 'replies', postId] as const
};

export class PostApiClient {
	static listPosts(
		courseId: string,
		kind: ThreadKind | null,
		filter: PostListFilter,
		after: string | null
	): Promise<PostListResponse> {
		const query = new URLSearchParams({ filter });
		if (kind) query.set('kind', kind);
		if (after) query.set('after', after);
		return ApiRequest.get(`/api/courses/${courseId}/posts?${query}`);
	}

	static createPost(courseId: string, request: CreatePostRequest): Promise<PostDetailResponse> {
		return ApiRequest.post(`/api/courses/${courseId}/posts`, request);
	}

	static getPost(postId: string): Promise<PostDetailResponse> {
		return ApiRequest.get(`/api/posts/${postId}`);
	}

	static listReplies(postId: string, after: string | null): Promise<ReplyListResponse> {
		const query = after ? `?${new URLSearchParams({ after })}` : '';
		return ApiRequest.get(`/api/posts/${postId}/replies${query}`);
	}

	static createReply(postId: string, request: CreateReplyRequest): Promise<ReplyResponse> {
		return ApiRequest.post(`/api/posts/${postId}/replies`, request);
	}

	static chooseAcceptedReply(postId: string, replyId: string): Promise<PostDetailResponse> {
		return ApiRequest.put(`/api/posts/${postId}/accepted-reply`, { replyId });
	}

	static clearAcceptedReply(postId: string): Promise<PostDetailResponse> {
		return ApiRequest.delete(`/api/posts/${postId}/accepted-reply`);
	}

	static lockPost(postId: string): Promise<PostDetailResponse> {
		return ApiRequest.put(`/api/posts/${postId}/lock`, {});
	}

	static unlockPost(postId: string): Promise<PostDetailResponse> {
		return ApiRequest.delete(`/api/posts/${postId}/lock`);
	}
}
