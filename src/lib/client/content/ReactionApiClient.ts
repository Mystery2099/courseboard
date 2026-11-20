import { ApiRequest } from '#lib/client/ApiRequest.ts';
import { postQueryKeys } from '#lib/client/content/PostApiClient.ts';
import type { ReactionEmoji, ThreadReactionsResponse } from '#lib/contracts/ReactionContract.ts';

/** Under `posts`, so the refetch after every course subscription covers reactions too. */
export const reactionQueryKeys = {
	thread: (postId: string) => [...postQueryKeys.all, 'reactions', postId] as const,
	/** The mutation key of a thread's reaction toggles, so pending ones can be shown before they land. */
	toggles: (postId: string) => ['reaction-toggles', postId] as const
};

export class ReactionApiClient {
	static listThreadReactions(postId: string): Promise<ThreadReactionsResponse> {
		return ApiRequest.get(`/api/posts/${postId}/reactions`);
	}

	/** `replyId` is null for the post itself. */
	static addReaction(postId: string, replyId: string | null, emoji: ReactionEmoji): Promise<void> {
		return ApiRequest.put(ReactionApiClient.path(postId, replyId, emoji), {});
	}

	static removeReaction(
		postId: string,
		replyId: string | null,
		emoji: ReactionEmoji
	): Promise<void> {
		return ApiRequest.delete(ReactionApiClient.path(postId, replyId, emoji));
	}

	private static path(postId: string, replyId: string | null, emoji: ReactionEmoji): string {
		const target = replyId ? `/api/posts/${postId}/replies/${replyId}` : `/api/posts/${postId}`;
		return `${target}/reactions/${emoji}`;
	}
}
