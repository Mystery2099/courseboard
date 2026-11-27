<script lang="ts">
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery, useQueryClient } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import { afterNavigate, beforeNavigate, type NavigationTarget } from '$app/navigation';
	import Check from 'lucide-svelte/icons/check';
	import Lock from 'lucide-svelte/icons/lock';
	import MessageCircle from 'lucide-svelte/icons/message-circle';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import {
		NO_REVIEW_FILTERS,
		PostApiClient,
		postQueryKeys,
		type ReviewListFilters
	} from '#lib/client/content/PostApiClient.ts';
	import { reviewQueryKeys } from '#lib/client/content/ReviewApiClient.ts';
	import {
		POST_LIST_FILTER_LABELS,
		formatRelativeTime,
		formatReplyCount
	} from '#lib/client/content/PostPresentation.ts';
	import {
		REVIEW_LIST_ORDERS,
		REVIEW_WORKLOADS,
		isWorkloadOrder,
		type PostListFilter,
		type PostListResponse,
		type PostKind
	} from '#lib/contracts/PostContract.ts';
	import FilterChipSelect from '#lib/components/FilterChipSelect.svelte';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import { ScrollTargetReveal } from '#lib/client/navigation/ScrollTargetReveal.ts';
	import {
		PostListReadingPositions,
		type PostListReadingPosition
	} from '#lib/client/navigation/PostListReadingPosition.ts';
	import ThreadKindBadge from './ThreadKindBadge.svelte';
	import PostListSkeleton from './PostListSkeleton.svelte';
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

	const filters = $derived<readonly PostListFilter[]>(
		kind === 'question'
			? ['active', 'newest', 'unanswered']
			: kind === 'review'
				? REVIEW_LIST_ORDERS
				: kind
					? ['active', 'newest']
					: []
	);
	let filter = $state<PostListFilter>('active');
	let reviewFilters = $state<ReviewListFilters>(NO_REVIEW_FILTERS);
	const isReviewListNarrowed = $derived(
		reviewFilters.workload !== null || reviewFilters.wouldTakeAgain !== null
	);

	const postsQuery = createInfiniteQuery(() => {
		// Read once per key, so a request still running for an earlier selection keeps its own.
		const listFilter = filter;
		const listReviewFilters = reviewFilters;
		return {
			queryKey: postQueryKeys.list(courseId, kind, listFilter, listReviewFilters),
			queryFn: ({ pageParam }: { pageParam: string | null }) =>
				PostApiClient.listPosts(courseId, kind, listFilter, pageParam, listReviewFilters),
			initialPageParam: null as string | null,
			getNextPageParam: (lastPage: PostListResponse) => lastPage.nextCursor,
			...(listFilter === 'active' &&
				!isReviewListNarrowed && {
					initialData: { pages: [initialPage], pageParams: [null] },
					initialDataUpdatedAt: initialPageLoadedAt
				})
		};
	});

	// A review whose workload was edited between pages can come back on a later page; keep only the
	// later copy, which is in its current place in the order.
	const posts = $derived.by(() => {
		const loadedPosts = postsQuery.data?.pages.flatMap((page) => page.posts) ?? [];
		const lastIndexById = new Map(loadedPosts.map((post, index) => [post.id, index]));
		return loadedPosts.filter((post, index) => lastIndexById.get(post.id) === index);
	});

	const queryClient = useQueryClient();
	const courseActivityNotices = getCourseActivityNotices();
	// A new review lands on the first page only of an unfiltered list ordered by date.
	const canShowNewPosts = $derived(!isReviewListNarrowed && !isWorkloadOrder(filter));
	const newPostIds = $derived(
		canShowNewPosts
			? courseActivityNotices.findNewPostIds(kind, new Set(posts.map((post) => post.id)))
			: []
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

	const threadRouteIds = new Set<string>(Object.values(THREAD_ROUTE_IDS));
	const isThreadInThisCourse = (target: NavigationTarget | null) =>
		threadRouteIds.has(target?.route.id ?? '') && target?.params?.courseId === courseId;

	let listElement = $state<HTMLElement>();
	let restoringPosition = $state<PostListReadingPosition | null>(null);

	beforeNavigate(({ to, willUnload }) => {
		if (willUnload || !to?.params?.postId || !isThreadInThisCourse(to) || !listElement) return;
		const anchorLink = [...listElement.querySelectorAll<HTMLElement>('a[id^="post-"]')].find(
			(link) => link.getBoundingClientRect().bottom > 0
		);
		// A thread opened from elsewhere, such as the composer, isn't a place in this list.
		if (!anchorLink || !posts.some((post) => post.id === to.params?.postId)) return;
		PostListReadingPositions.save(courseId, kind, {
			filter,
			reviewFilters,
			anchorPostId: anchorLink.id.slice('post-'.length),
			anchorTop: anchorLink.getBoundingClientRect().top,
			openedPostId: to.params.postId,
			loadedPageCount: postsQuery.data?.pages.length ?? 1,
			savedAt: Date.now()
		});
	});

	/** Input from the reader while pages load ends the restore; the browser's own scrolling doesn't. */
	const READER_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
	$effect(() => {
		if (!restoringPosition) return;
		const cancelRestore = () => (restoringPosition = null);
		for (const type of READER_INPUT_EVENTS) window.addEventListener(type, cancelRestore, true);
		return () => {
			for (const type of READER_INPUT_EVENTS) window.removeEventListener(type, cancelRestore, true);
		};
	});

	// Only a return from the thread opened here restores the place. A return from any thread of this
	// course without a live position starts at the top, even by Back; other arrivals keep the
	// browser's usual behavior.
	afterNavigate(({ from }) => {
		if (!isThreadInThisCourse(from)) return;
		const position = PostListReadingPositions.take(courseId, kind);
		if (!position || position.openedPostId !== from?.params?.postId) {
			window.scrollTo({ top: 0, behavior: 'instant' });
			return;
		}
		filter = position.filter;
		reviewFilters = position.reviewFilters;
		restoringPosition = position;
	});

	// Loads as many pages as the reader had, at most, until the row they were looking at and the post
	// they opened are both back.
	$effect(() => {
		const position = restoringPosition;
		if (!position) return;
		// Choosing another order or filter, by any means, ends the restore too.
		if (filter !== position.filter || reviewFilters !== position.reviewFilters) {
			restoringPosition = null;
			return;
		}
		// A refresh of stale pages can still move rows, so the place is found after it settles.
		if (postsQuery.isPending || postsQuery.isFetching) return;
		const findLoadedLink = (postId: string) =>
			posts.some((post) => post.id === postId) ? document.getElementById(`post-${postId}`) : null;
		const anchorLink = findLoadedLink(position.anchorPostId);
		const openedLink = findLoadedLink(position.openedPostId);
		const loadedPageCount = postsQuery.data?.pages.length ?? 0;
		const canLoadMore =
			postsQuery.hasNextPage &&
			!postsQuery.isFetchNextPageError &&
			loadedPageCount < position.loadedPageCount;
		const scrollTarget =
			window.scrollY + (anchorLink?.getBoundingClientRect().top ?? 0) - position.anchorTop;
		const isTargetReachable =
			scrollTarget <= document.documentElement.scrollHeight - window.innerHeight;
		if ((!anchorLink || !openedLink || !isTargetReachable) && canLoadMore) {
			void postsQuery.fetchNextPage({ cancelRefetch: false });
			return;
		}
		restoringPosition = null;
		if (document.activeElement !== document.body) return;
		if (anchorLink) {
			window.scrollBy({
				top: anchorLink.getBoundingClientRect().top - position.anchorTop,
				behavior: 'instant'
			});
		}
		// A post that moved off screen while the reader was away isn't focused out of sight.
		const openedBounds = openedLink?.getBoundingClientRect();
		const isOpenedPostVisible =
			openedBounds &&
			openedBounds.bottom > 0 &&
			openedBounds.top < ScrollTargetReveal.visibleAreaBottom();
		if (isOpenedPostVisible) {
			openedLink?.focus({ preventScroll: true });
		}
	});

	/** Loads the next page when the end of the list scrolls into view; Load more stays as fallback. */
	function loadWhenVisible(sentinel: HTMLElement) {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting && postsQuery.hasNextPage && !postsQuery.isFetching) {
				void postsQuery.fetchNextPage({ cancelRefetch: false });
			}
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	}
</script>

{#if kind === 'review'}
	<!-- Reviews have four orders and two filters, so the order is a select beside them, not a chip row. -->
	<div class="mt-4 flex flex-wrap gap-2">
		<FilterChipSelect
			label={m.post_list_order()}
			onchange={(event) => (filter = event.currentTarget.value as PostListFilter)}
			options={filters.map((option) => ({
				value: option,
				label: POST_LIST_FILTER_LABELS[option](),
				isSelected: option === filter
			}))}
		/>
		<FilterChipSelect
			label={m.reviews_filter_workload()}
			onchange={(event) => {
				const workload = event.currentTarget.value;
				reviewFilters = { ...reviewFilters, workload: workload ? Number(workload) : null };
			}}
			options={[
				{
					value: '',
					label: m.reviews_filter_any_workload(),
					isSelected: reviewFilters.workload === null
				},
				...REVIEW_WORKLOADS.map((workload) => ({
					value: String(workload),
					label: m.review_facts_workload_value({ workload }),
					isSelected: reviewFilters.workload === workload
				}))
			]}
		/>
		<FilterChipSelect
			label={m.reviews_filter_take_again()}
			onchange={(event) => {
				const answer = event.currentTarget.value;
				reviewFilters = {
					...reviewFilters,
					wouldTakeAgain: answer === 'yes' || answer === 'no' ? answer : null
				};
			}}
			options={[
				{
					value: '',
					label: m.reviews_filter_any_answer(),
					isSelected: reviewFilters.wouldTakeAgain === null
				},
				{ value: 'yes', label: m.common_yes(), isSelected: reviewFilters.wouldTakeAgain === 'yes' },
				{ value: 'no', label: m.common_no(), isSelected: reviewFilters.wouldTakeAgain === 'no' }
			]}
		/>
	</div>
{/if}

{#if filters.length > 0 && kind !== 'review'}
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
	<!-- Keyed, so a filter chosen during another's load gets its own full second. -->
	{#key JSON.stringify([filter, reviewFilters])}
		<PostListSkeleton />
	{/key}
{:else if postsQuery.isError && posts.length === 0}
	<p class="mt-4 text-sm text-error" role="alert">
		{m.post_list_load_failed()}
		<button
			type="button"
			class="font-semibold underline underline-offset-2 hover:decoration-2"
			onclick={() => postsQuery.refetch()}>{m.common_try_again()}</button
		>
	</p>
{:else if posts.length === 0 && isReviewListNarrowed}
	<p class="mt-4 text-sm text-on-surface-variant">
		{m.reviews_filter_none_match()}
		<button
			type="button"
			class="font-semibold text-primary underline-offset-2 hover:underline"
			onclick={() => (reviewFilters = NO_REVIEW_FILTERS)}>{m.reviews_filter_clear()}</button
		>
	</p>
{:else if posts.length === 0}
	<p class="mt-4 text-sm text-on-surface-variant">
		{filter === 'unanswered' ? m.post_list_all_answered() : emptyMessage}
	</p>
{:else}
	<!-- Conversation cards, as in Teams: who started it, what it is, and how many have replied. -->
	<ul class="mt-4 flex flex-col gap-2.5" bind:this={listElement}>
		{#each posts as post (post.id)}
			<li>
				<a
					id="post-{post.id}"
					href={resolve(THREAD_ROUTE_IDS[post.kind], { courseId, postId: post.id })}
					class="block rounded-card border list-row bg-surface px-4 py-3 [--state-base:var(--surface)]"
				>
					<!-- The reply count sits at the title's end, so it never needs a row of its own. -->
					<span class="flex items-start gap-3">
						<span class="min-w-0 flex-1 font-heading text-lg leading-snug font-bold wrap-break-word"
							>{post.title}</span
						>
						<span
							class="mt-0.5 flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary"
						>
							<MessageCircle size={16} aria-hidden="true" />
							<span aria-hidden="true">{post.replyCount}</span>
							<span class="sr-only">{formatReplyCount(post.replyCount)}</span>
						</span>
					</span>
					{#if post.reviewData}
						<ReviewFacts review={post.reviewData} />
					{/if}
					<!-- One meta row for the author, time, and badges, so a card spends no row on chrome. -->
					<span class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
						<span class="flex min-w-0 items-center gap-2">
							<UserAvatar
								username={post.author.username}
								displayName={post.author.displayName}
								size={24}
							/>
							<span class="min-w-0 font-semibold [overflow-wrap:anywhere]"
								>{post.author.displayName}</span
							>
						</span>
						<time class="text-on-surface-variant" datetime={post.lastActivityAt}
							>{formatRelativeTime(post.lastActivityAt)}</time
						>
						{#if kind === null}<ThreadKindBadge kind={post.kind} />{/if}
						{#if post.hasAcceptedReply}
							<Badge variant="success"><Check size={14} /> {m.post_badge_answered()}</Badge>
						{/if}
						{#if post.isLocked}
							<Badge variant="neutral"><Lock size={14} /> {m.post_badge_locked()}</Badge>
						{/if}
					</span>
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
				disabled={postsQuery.isFetching}
				onclick={() => postsQuery.fetchNextPage({ cancelRefetch: false })}
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
