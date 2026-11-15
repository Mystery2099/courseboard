<script lang="ts">
	import {
		buttonClass,
		filterChipClass,
		statusChipClass
	} from '#lib/components/ui/ControlStyles.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import Check from 'lucide-svelte/icons/check';
	import Lock from 'lucide-svelte/icons/lock';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import {
		POST_LIST_FILTER_LABELS,
		formatRelativeTime,
		formatReplyCount
	} from '#lib/client/content/PostPresentation.ts';
	import type { PostListFilter, PostListResponse, PostKind } from '#lib/contracts/PostContract.ts';
	import { THREAD_ROUTE_IDS } from '#lib/navigation/CourseChannel.ts';
	import ThreadKindBadge from './ThreadKindBadge.svelte';
	import ReviewFacts from './ReviewFacts.svelte';

	let {
		courseId,
		kind,
		initialPage,
		initialPageLoadedAt,
		emptyMessage
	}: {
		courseId: string;
		/** Null lists every kind, as the course overview does. */
		kind: PostKind | null;
		/** The first page of the Active filter, rendered on the server. */
		initialPage: PostListResponse;
		initialPageLoadedAt: number;
		emptyMessage: string;
	} = $props();

	const filters = $derived<PostListFilter[]>(
		kind === 'question' ? ['active', 'newest', 'unanswered'] : kind ? ['active', 'newest'] : []
	);
	let filter = $state<PostListFilter>('active');

	const postsQuery = createInfiniteQuery(() => ({
		queryKey: postQueryKeys.list(courseId, kind, filter),
		queryFn: ({ pageParam }) => PostApiClient.listPosts(courseId, kind, filter, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		...(filter === 'active' && {
			initialData: { pages: [initialPage], pageParams: [null] },
			initialDataUpdatedAt: initialPageLoadedAt
		})
	}));

	const posts = $derived(postsQuery.data?.pages.flatMap((page) => page.posts) ?? []);

	/** Loads the next page when the end of the list scrolls into view; Load more stays as fallback. */
	function loadWhenVisible(sentinel: HTMLElement) {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting && postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
				void postsQuery.fetchNextPage();
			}
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	}
</script>

{#if filters.length > 0}
	<div class="mt-3 flex flex-wrap gap-x-2 gap-y-3" role="group" aria-label={m.post_list_order()}>
		{#each filters as option (option)}
			<button
				type="button"
				class={filterChipClass(option === filter)}
				aria-pressed={option === filter}
				onclick={() => (filter = option)}>{POST_LIST_FILTER_LABELS[option]()}</button
			>
		{/each}
	</div>
{/if}

{#if postsQuery.isPending}
	<p class="mt-4 text-sm text-on-surface-variant">{m.common_loading()}</p>
{:else if postsQuery.isError && posts.length === 0}
	<p class="mt-4 text-sm text-error" role="alert">{m.post_list_load_failed()}</p>
{:else if posts.length === 0}
	<p class="mt-4 text-sm text-on-surface-variant">
		{filter === 'unanswered' ? m.post_list_all_answered() : emptyMessage}
	</p>
{:else}
	<ul class="mt-4 divide-y overflow-hidden rounded-card border bg-surface">
		{#each posts as post (post.id)}
			<li>
				<a
					href={resolve(THREAD_ROUTE_IDS[post.kind], { courseId, postId: post.id })}
					class="block px-4 py-3 hover:bg-surface-container"
				>
					<span class="flex flex-wrap items-center gap-2">
						{#if kind === null}<ThreadKindBadge kind={post.kind} />{/if}
						{#if post.hasAcceptedReply}
							<span class={statusChipClass('success')}
								><Check size={14} /> {m.post_badge_answered()}</span
							>
						{/if}
						{#if post.isLocked}
							<span class={statusChipClass('neutral')}
								><Lock size={14} /> {m.post_badge_locked()}</span
							>
						{/if}
					</span>
					<span class="mt-1 block font-semibold wrap-break-word">{post.title}</span>
					<span class="mt-1 block text-sm text-on-surface-variant">
						{post.author.displayName} · {formatReplyCount(post.replyCount)} ·
						<time datetime={post.lastActivityAt}>{formatRelativeTime(post.lastActivityAt)}</time>
					</span>
					{#if post.reviewData}
						<ReviewFacts review={post.reviewData} />
					{/if}
				</a>
			</li>
		{/each}
	</ul>
	{#if postsQuery.hasNextPage}
		<div {@attach loadWhenVisible}>
			<button
				type="button"
				class={[buttonClass('outlined', 'compact'), 'mt-3']}
				disabled={postsQuery.isFetchingNextPage}
				onclick={() => postsQuery.fetchNextPage()}
				>{postsQuery.isFetchingNextPage ? m.common_loading() : m.common_load_more()}</button
			>
		</div>
	{/if}
{/if}
