<script lang="ts">
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
	<div class="mt-3 flex gap-2" role="group" aria-label={m.post_list_order()}>
		{#each filters as option (option)}
			<button
				type="button"
				class={[
					'rounded-full border px-4 py-1.5 text-sm',
					option === filter && 'border-transparent bg-indigo-100 font-semibold'
				]}
				aria-pressed={option === filter}
				onclick={() => (filter = option)}>{POST_LIST_FILTER_LABELS[option]()}</button
			>
		{/each}
	</div>
{/if}

{#if postsQuery.isPending}
	<p class="mt-4 text-sm text-slate-600">{m.common_loading()}</p>
{:else if postsQuery.isError && posts.length === 0}
	<p class="mt-4 text-sm text-red-700" role="alert">{m.post_list_load_failed()}</p>
{:else if posts.length === 0}
	<p class="mt-4 text-sm text-slate-600">
		{filter === 'unanswered' ? m.post_list_all_answered() : emptyMessage}
	</p>
{:else}
	<ul class="mt-4 divide-y overflow-hidden rounded-[20px] border bg-white">
		{#each posts as post (post.id)}
			<li>
				<a
					href={resolve(THREAD_ROUTE_IDS[post.kind], { courseId, postId: post.id })}
					class="block px-4 py-3 hover:bg-slate-50"
				>
					<span class="flex flex-wrap items-center gap-2">
						{#if kind === null}<ThreadKindBadge kind={post.kind} />{/if}
						{#if post.hasAcceptedReply}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-semibold text-emerald-900"
								><Check size={14} /> {m.post_badge_answered()}</span
							>
						{/if}
						{#if post.isLocked}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-sm font-semibold text-slate-800"
								><Lock size={14} /> {m.post_badge_locked()}</span
							>
						{/if}
					</span>
					<span class="mt-1 block font-semibold wrap-break-word">{post.title}</span>
					<span class="mt-1 block text-sm text-slate-600">
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
				class="mt-3 rounded-full border px-4 py-1.5 disabled:opacity-50"
				disabled={postsQuery.isFetchingNextPage}
				onclick={() => postsQuery.fetchNextPage()}
				>{postsQuery.isFetchingNextPage ? m.common_loading() : m.common_load_more()}</button
			>
		</div>
	{/if}
{/if}
