<script lang="ts">
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery, useQueryClient } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import Check from 'lucide-svelte/icons/check';
	import Lock from 'lucide-svelte/icons/lock';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import { reviewQueryKeys } from '#lib/client/content/ReviewApiClient.ts';
	import {
		POST_LIST_FILTER_LABELS,
		formatRelativeTime,
		formatReplyCount
	} from '#lib/client/content/PostPresentation.ts';
	import type { PostListFilter, PostListResponse, PostKind } from '#lib/contracts/PostContract.ts';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import ThreadKindBadge from './ThreadKindBadge.svelte';
	import ReviewFacts from './ReviewFacts.svelte';
	import NewActivityNotice from './NewActivityNotice.svelte';
	import { getCourseActivityNotices } from '#lib/client/realtime/CourseActivityNotices.svelte.ts';
	import { NewActivityReveal } from '#lib/client/realtime/NewActivityReveal.svelte.ts';

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

	const queryClient = useQueryClient();
	const courseActivityNotices = getCourseActivityNotices();
	const newPostIds = $derived(
		courseActivityNotices.findNewPostIds(kind, new Set(posts.map((post) => post.id)))
	);
	const newPostsReveal = new NewActivityReveal();

	/** Refetches the list, then moves focus to the newest post shown. */
	function showNewPosts() {
		const announcedPostIds = new Set(newPostIds);
		return newPostsReveal.reveal(
			async () => {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(courseId) }),
					// Review statistics include the new reviews.
					kind === 'review' &&
						queryClient.invalidateQueries({ queryKey: reviewQueryKeys.context(courseId) })
				]);
				// A post that left this filter meanwhile, such as a question answered before the click,
				// can't be shown here, so stop offering it.
				if (!postsQuery.isError) courseActivityNotices.forgetPosts(announcedPostIds);
			},
			() => {
				const firstNewPost = posts.find((post) => announcedPostIds.has(post.id));
				return firstNewPost && `post-${firstNewPost.id}`;
			}
		);
	}

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
	<ToggleGroup.Root
		type="single"
		class="mt-3"
		aria-label={m.post_list_order()}
		bind:value={() => filter, (option) => option && (filter = option as PostListFilter)}
	>
		{#each filters as option (option)}
			<ToggleGroup.Item value={option}>{POST_LIST_FILTER_LABELS[option]()}</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
{/if}

<NewActivityNotice
	label={newPostIds.length > 0 ? m.realtime_show_new_posts({ count: newPostIds.length }) : ''}
	isShowing={newPostsReveal.isShowing}
	onShow={showNewPosts}
/>

{#if postsQuery.isPending}
	<p class="mt-4 text-sm text-on-surface-variant">{m.common_loading()}</p>
{:else if postsQuery.isError && posts.length === 0}
	<p class="mt-4 text-sm text-error" role="alert">
		{m.post_list_load_failed()}
		<button
			type="button"
			class="font-semibold underline underline-offset-2 hover:decoration-2"
			onclick={() => postsQuery.refetch()}>{m.common_try_again()}</button
		>
	</p>
{:else if posts.length === 0}
	<p class="mt-4 text-sm text-on-surface-variant">
		{filter === 'unanswered' ? m.post_list_all_answered() : emptyMessage}
	</p>
{:else}
	<ul class="mt-4 divide-y overflow-hidden rounded-card border bg-surface">
		{#each posts as post (post.id)}
			<li>
				<a
					id="post-{post.id}"
					href={resolve(THREAD_ROUTE_IDS[post.kind], { courseId, postId: post.id })}
					class="block list-row px-4 py-3 [--state-base:var(--surface)]"
				>
					<span class="flex flex-wrap items-center gap-2">
						{#if kind === null}<ThreadKindBadge kind={post.kind} />{/if}
						{#if post.hasAcceptedReply}
							<Badge variant="success"><Check size={14} /> {m.post_badge_answered()}</Badge>
						{/if}
						{#if post.isLocked}
							<Badge variant="neutral"><Lock size={14} /> {m.post_badge_locked()}</Badge>
						{/if}
					</span>
					<span class="mt-1 block font-heading text-lg leading-snug font-bold wrap-break-word"
						>{post.title}</span
					>
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
			<Button
				variant="outlined"
				size="compact"
				class="mt-3"
				disabled={postsQuery.isFetchingNextPage}
				onclick={() => postsQuery.fetchNextPage()}
				>{postsQuery.isFetchingNextPage
					? m.common_loading()
					: postsQuery.isFetchNextPageError
						? m.common_try_again()
						: m.common_load_more()}</Button
			>
		</div>
	{/if}
	{#if postsQuery.isFetchNextPageError}
		<p class="mt-2 text-sm text-error" role="alert">{m.post_list_load_failed()}</p>
	{/if}
{/if}
