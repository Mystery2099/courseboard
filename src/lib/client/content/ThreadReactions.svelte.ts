import {
	createMutation,
	createQuery,
	useMutationState,
	useQueryClient,
	type CreateMutationResult,
	type CreateQueryResult
} from '@tanstack/svelte-query';
import type { ReactionEmoji, ThreadReactionsResponse } from '#lib/contracts/ReactionContract.ts';
import { ReactionApiClient, reactionQueryKeys } from './ReactionApiClient.ts';
import { applyReactionToggle, type ReactionToggle } from './ReactionPresentation.ts';

/** The last toggle that failed: its target, a reply id or null for the post, and why. */
export interface ReactionFailure {
	replyId: string | null;
	error: Error;
}

/**
 * A thread's reaction counts with the viewer's own toggles shown on top while they save. Create it
 * while a component initializes, since it uses that component's query client.
 */
export class ThreadReactions {
	failure = $state<ReactionFailure | null>(null);

	readonly #reactionsQuery: CreateQueryResult<ThreadReactionsResponse>;
	readonly #reactionMutation: CreateMutationResult<void, Error, ReactionToggle>;
	readonly #pendingToggles: ReactionToggle[];

	/** Undefined on a review thread. */
	readonly reactions = $derived.by(
		() =>
			this.#reactionsQuery.data &&
			this.#pendingToggles.reduce(applyReactionToggle, this.#reactionsQuery.data)
	);

	/** `initialReactions` is null on a review thread, which takes no reactions. */
	constructor(
		postId: string,
		initialReactions: ThreadReactionsResponse | null,
		initialLoadedAt: number
	) {
		const queryClient = useQueryClient();
		const reactionsQueryKey = reactionQueryKeys.thread(postId);
		this.#reactionsQuery = createQuery(() => ({
			queryKey: reactionsQueryKey,
			queryFn: () => ReactionApiClient.listThreadReactions(postId),
			initialData: initialReactions ?? undefined,
			initialDataUpdatedAt: initialLoadedAt,
			enabled: initialReactions !== null
		}));
		const reactionMutationKey = reactionQueryKeys.toggles(postId);
		this.#reactionMutation = createMutation(() => ({
			mutationKey: reactionMutationKey,
			// One at a time per thread, so a quick add and remove reach the server in the order tapped.
			scope: { id: `reactions-${postId}` },
			mutationFn: ({ replyId, emoji, isAdding }: ReactionToggle) =>
				isAdding
					? ReactionApiClient.addReaction(postId, replyId, emoji)
					: ReactionApiClient.removeReaction(postId, replyId, emoji),
			// Kept in the cache too, so a saved toggle stays shown even if the refetch below fails. A
			// fetch begun before the save is cancelled first, so its older counts can't land on top.
			onSuccess: async (_result, toggle) => {
				await queryClient.cancelQueries({ queryKey: reactionsQueryKey });
				queryClient.setQueryData<ThreadReactionsResponse>(reactionsQueryKey, (current) =>
					current ? applyReactionToggle(current, toggle) : current
				);
			},
			onError: (error, { replyId }) => (this.failure = { replyId, error }),
			// A saved toggle stays pending until the refetch lands, so it never blinks off in between. A
			// failed one settles at once, so it drops out and the next toggle isn't held behind the fetch.
			onSettled: (_result, error) => {
				const refetch = queryClient.invalidateQueries({ queryKey: reactionsQueryKey });
				if (!error) return refetch;
			}
		}));
		// Toggles still waiting or sending are shown over the server's counts, so any refetch,
		// including one from another tab's reaction, keeps them, and a failed one simply drops out.
		this.#pendingToggles = useMutationState({
			filters: { mutationKey: reactionMutationKey, status: 'pending' },
			select: (mutation) => mutation.state.variables as ReactionToggle
		});
	}

	toggle(replyId: string | null, emoji: ReactionEmoji, isAdding: boolean) {
		this.failure = null;
		this.#reactionMutation.mutate({ replyId, emoji, isAdding });
	}
}
