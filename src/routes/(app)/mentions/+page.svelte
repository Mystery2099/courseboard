<script lang="ts">
	import { createInfiniteQuery, useQueryClient } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import ThreadKindBadge from '#lib/components/content/ThreadKindBadge.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { MentionApiClient, mentionQueryKeys } from '#lib/client/content/MentionApiClient.ts';
	import { formatRelativeTime } from '#lib/client/content/PostPresentation.ts';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const queryClient = useQueryClient();

	// Each visit loads the list on the server, which replaces any older copy in the cache.
	$effect.pre(() => {
		queryClient.setQueryData(
			mentionQueryKeys.list(),
			{ pages: [data.mentions], pageParams: [null] },
			{ updatedAt: data.loadedAt }
		);
	});

	const mentionsQuery = createInfiniteQuery(() => ({
		queryKey: mentionQueryKeys.list(),
		queryFn: ({ pageParam }) => MentionApiClient.listMentions(pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialData: { pages: [data.mentions], pageParams: [null] },
		initialDataUpdatedAt: data.loadedAt
	}));
	const mentions = $derived(mentionsQuery.data?.pages.flatMap((page) => page.mentions) ?? []);
</script>

<svelte:head><title>{m.mentions_title()}</title></svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-headline font-bold">{m.mentions_title()}</h1>
	<p class="mt-1 text-sm text-on-surface-variant">{m.mentions_description()}</p>

	{#if mentionsQuery.isError && mentions.length === 0}
		<p class="mt-4 text-sm text-error" role="alert">
			{m.mentions_load_failed()}
			<button
				type="button"
				class="font-semibold underline underline-offset-2 hover:decoration-2"
				onclick={() => mentionsQuery.refetch()}>{m.common_try_again()}</button
			>
		</p>
	{:else if mentions.length === 0}
		<p class="mt-6 text-sm text-on-surface-variant">{m.mentions_empty()}</p>
	{:else}
		<ul class="mt-6 divide-y overflow-hidden rounded-card border bg-surface">
			{#each mentions as mention (mention.id)}
				<li>
					<a
						href="{resolve(THREAD_ROUTE_IDS[mention.postKind], {
							courseId: mention.courseId,
							postId: mention.postId
						})}{mention.replyId ? `#reply-${mention.replyId}` : ''}"
						class="block list-row px-4 py-3 [--state-base:var(--surface)]"
					>
						<span class="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
							<span class="font-mono font-semibold">{mention.courseCode}</span>
							<ThreadKindBadge kind={mention.postKind} />
						</span>
						<span class="mt-1 block font-heading text-lg leading-snug font-bold wrap-break-word"
							>{mention.postTitle}</span
						>
						<span class="mt-1 block wrap-break-word text-body">{mention.excerpt}</span>
						<span class="mt-1 block text-sm text-on-surface-variant">
							{mention.replyId
								? m.mentions_by_in_reply({ name: mention.author.displayName })
								: m.mentions_by_in_post({ name: mention.author.displayName })} ·
							<time datetime={mention.createdAt}>{formatRelativeTime(mention.createdAt)}</time>
						</span>
					</a>
				</li>
			{/each}
		</ul>
		{#if mentionsQuery.hasNextPage}
			<Button
				variant="outlined"
				size="compact"
				class="mt-3"
				disabled={mentionsQuery.isFetchingNextPage}
				onclick={() => mentionsQuery.fetchNextPage()}
				>{mentionsQuery.isFetchingNextPage
					? m.common_loading()
					: mentionsQuery.isFetchNextPageError
						? m.common_try_again()
						: m.common_load_more()}</Button
			>
		{/if}
		{#if mentionsQuery.isFetchNextPageError}
			<p class="mt-2 text-sm text-error" role="alert">{m.mentions_load_failed()}</p>
		{/if}
	{/if}
</main>
