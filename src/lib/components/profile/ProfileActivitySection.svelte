<script lang="ts">
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import {
		ProfileActivityApiClient,
		profileActivityQueryKeys
	} from '#lib/client/profile/ProfileActivityApiClient.ts';
	import {
		THREAD_KIND_LABELS,
		formatRelativeTime,
		formatReplyCount
	} from '#lib/client/content/PostPresentation.ts';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import {
		PROFILE_ACTIVITY_TYPES,
		type ProfileActivityPageResponse,
		type ProfileActivityType
	} from '#lib/contracts/ProfileActivityContract.ts';
	import ReviewFacts from '#lib/components/content/ReviewFacts.svelte';

	const TYPE_LABELS: Record<ProfileActivityType, () => string> = {
		posts: m.profile_activity_posts,
		replies: m.profile_activity_replies,
		reviews: m.profile_activity_reviews
	};
	const EMPTY_MESSAGES: Record<ProfileActivityType, () => string> = {
		posts: m.profile_activity_no_posts,
		replies: m.profile_activity_no_replies,
		reviews: m.profile_activity_no_reviews
	};

	let type = $state<ProfileActivityType>('posts');

	const activityQuery = createInfiniteQuery(() => {
		// Read once per key, so a request still running for an earlier tab keeps its own type.
		const listType = type;
		return {
			queryKey: profileActivityQueryKeys.list(listType),
			queryFn: ({ pageParam }: { pageParam: string | null }) =>
				ProfileActivityApiClient.listOwnActivity(listType, pageParam),
			initialPageParam: null as string | null,
			getNextPageParam: (lastPage: ProfileActivityPageResponse) => lastPage.nextCursor,
			// Posting elsewhere doesn't refresh this list, so read it again whenever the profile opens.
			staleTime: 0
		};
	});

	const pages = $derived(activityQuery.data?.pages ?? []);
	const posts = $derived(pages.flatMap((page) => (page.type === 'replies' ? [] : page.posts)));
	const replies = $derived(pages.flatMap((page) => (page.type === 'replies' ? page.replies : [])));
	const isEmpty = $derived(type === 'replies' ? replies.length === 0 : posts.length === 0);
</script>

<section class="mt-10" aria-labelledby="activity-heading">
	<h2 id="activity-heading" class="text-xl font-semibold">{m.profile_activity_heading()}</h2>
	<p class="mt-2 text-sm text-on-surface-variant">{m.profile_activity_explanation()}</p>

	<ToggleGroup.Root
		type="single"
		class="mt-3"
		aria-label={m.profile_activity_type()}
		bind:value={() => type, (option) => option && (type = option as ProfileActivityType)}
	>
		{#each PROFILE_ACTIVITY_TYPES as option (option)}
			<ToggleGroup.Item value={option}>{TYPE_LABELS[option]()}</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	{#if activityQuery.isPending}
		<p class="mt-4 text-sm text-on-surface-variant">{m.common_loading()}</p>
	{:else if activityQuery.isError && isEmpty}
		<p class="mt-4 text-sm text-error" role="alert">
			{m.profile_activity_load_failed()}
			<button
				type="button"
				class="font-semibold underline underline-offset-2 hover:decoration-2"
				onclick={() => activityQuery.refetch()}>{m.common_try_again()}</button
			>
		</p>
	{:else if isEmpty && !activityQuery.hasNextPage}
		<p class="mt-4 rounded-card border bg-surface p-4 text-on-surface-variant">
			{EMPTY_MESSAGES[type]()}
		</p>
	{:else}
		<!-- A page of replies can be empty when every reply on it is under a removed post. -->
		{#if !isEmpty}
			<ul class="mt-4 divide-y overflow-hidden rounded-card border bg-surface">
				{#if type === 'replies'}
					{#each replies as reply (reply.id)}
						<li>
							<a
								href="{resolve(THREAD_ROUTE_IDS[reply.postKind], {
									courseId: reply.course.id,
									postId: reply.postId
								})}#reply-{reply.id}"
								class="block list-row px-4 py-3 [--state-base:var(--surface)]"
							>
								<span class="block text-sm text-on-surface-variant">
									<span class="font-mono font-semibold text-primary">{reply.course.code}</span>
									· {m.profile_activity_reply_on({ title: reply.postTitle })}
								</span>
								<span class="mt-1 block wrap-break-word">{reply.excerpt}</span>
								<time class="mt-1 block text-sm text-on-surface-variant" datetime={reply.createdAt}
									>{formatRelativeTime(reply.createdAt)}</time
								>
							</a>
						</li>
					{/each}
				{:else}
					{#each posts as post (post.id)}
						<li>
							<a
								href={resolve(THREAD_ROUTE_IDS[post.kind], {
									courseId: post.course.id,
									postId: post.id
								})}
								class="block list-row px-4 py-3 [--state-base:var(--surface)]"
							>
								<span class="block text-sm text-on-surface-variant">
									<span class="font-mono font-semibold text-primary">{post.course.code}</span>
									· {THREAD_KIND_LABELS[post.kind]()}
								</span>
								<span class="mt-1 block font-heading text-lg leading-snug font-bold wrap-break-word"
									>{post.title}</span
								>
								<span class="mt-1 block text-sm text-on-surface-variant">
									{formatReplyCount(post.replyCount)} ·
									<time datetime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
								</span>
								{#if post.reviewData}
									<ReviewFacts review={post.reviewData} />
								{/if}
							</a>
						</li>
					{/each}
				{/if}
			</ul>
		{/if}
		{#if activityQuery.hasNextPage}
			<Button
				variant="outlined"
				size="compact"
				class="mt-3"
				disabled={activityQuery.isFetchingNextPage}
				onclick={() => activityQuery.fetchNextPage()}
				>{activityQuery.isFetchingNextPage
					? m.common_loading()
					: activityQuery.isFetchNextPageError
						? m.common_try_again()
						: m.common_load_more()}</Button
			>
		{/if}
		{#if activityQuery.isFetchNextPageError}
			<p class="mt-2 text-sm text-error" role="alert">{m.profile_activity_load_failed()}</p>
		{/if}
	{/if}
</section>
