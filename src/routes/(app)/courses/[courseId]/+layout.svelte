<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Check from 'lucide-svelte/icons/check';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import SearchIcon from 'lucide-svelte/icons/search';
	import HistoryEntryEditorDialog from '#lib/components/history/HistoryEntryEditorDialog.svelte';
	import {
		COURSE_CHANNELS,
		COURSE_CHANNEL_ICONS,
		COURSE_CHANNEL_LABELS,
		COURSE_CHANNEL_ROUTE_IDS,
		findCourseChannel
	} from '#lib/client/navigation/CourseChannel.ts';
	import { CourseNavigationApiClient } from '#lib/client/catalog/CourseNavigationApiClient.ts';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import { untrack } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import { reviewQueryKeys } from '#lib/client/content/ReviewApiClient.ts';
	import { reactionQueryKeys } from '#lib/client/content/ReactionApiClient.ts';
	import { getRealtimeConnectionAccessor } from '#lib/client/realtime/RealtimeConnectionContext.ts';
	import {
		CourseActivityNotices,
		setCourseActivityNotices
	} from '#lib/client/realtime/CourseActivityNotices.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let isHistoryEditorOpen = $state(false);
	let wasAddedToHistory = $state(false);
	const historyCourse = $derived({
		id: data.course.id,
		code: data.course.code,
		title: data.course.title,
		institution: data.course.institution
	});

	const currentChannel = $derived(findCourseChannel(page.route.id));
	const isReadingThread = $derived(page.params.postId !== undefined);
	const isOverview = $derived(currentChannel === 'overview');

	const queryClient = useQueryClient();
	const getRealtimeConnection = getRealtimeConnectionAccessor();
	const isReconnecting = $derived(getRealtimeConnection()?.status === 'disconnected');
	const courseActivityNotices = new CourseActivityNotices();
	setCourseActivityNotices(courseActivityNotices);

	// Derived, so reloading this course's data (after following it, say) keeps the subscription.
	const courseId = $derived(data.course.id);
	$effect(() => {
		const connection = getRealtimeConnection();
		untrack(() => courseActivityNotices.clear());
		if (!connection) return;
		return connection.subscribeToCourse(courseId, {
			onPostCreated: (event) => courseActivityNotices.recordPost(event),
			// Refetching the post swaps the reply composers; their drafts are kept per thread.
			// Lists aren't refetched, since that would also load the new posts a notice is holding back.
			onPostLockChanged: (event) =>
				void queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(event.postId) }),
			onReplyCreated: (event) => courseActivityNotices.recordReply(event),
			// Counts change in place without moving anything, so they refresh without a notice.
			onReactionChanged: (event) =>
				void queryClient.invalidateQueries({ queryKey: reactionQueryKeys.thread(event.postId) }),
			// Catches up on anything sent before the room was joined. Only queries on screen refetch,
			// and the notices then clear themselves.
			onSubscribed: () => {
				void queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
				void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
			}
		});
	});

	// Recorded from the browser after the space renders, so hover preloads don't count as visits.
	$effect(() => {
		void CourseNavigationApiClient.recordVisit(data.course.id).catch(() => undefined);
	});
	let isFollowPending = $state(false);
	// Opens post search narrowed to this course, at its school so the course filter applies.
	const courseSearchUrl = $derived(
		`${resolve('/(app)/search')}?${new URLSearchParams({
			scope: 'posts',
			institutionId: data.course.institution.id,
			courseId: data.course.id
		})}`
	);
	const followActionUrl = $derived(
		`${resolve('/(app)/courses/[courseId]', { courseId: data.course.id })}?/${data.course.isFollowed ? 'unfollow' : 'follow'}`
	);
</script>

<svelte:head><title>{data.course.code} · {data.course.title}</title></svelte:head>

<!-- Shown in whichever header is on screen; the live region below announces it. -->
{#snippet reconnectingStatus()}
	<p class="shrink-0 text-xs text-on-surface-variant" aria-hidden="true">
		{isReconnecting ? m.realtime_reconnecting() : ''}
	</p>
{/snippet}

<!-- Outside the headers, so swapping between them doesn't replace it and lose the announcement. -->
<p class="sr-only" role="status">{isReconnecting ? m.realtime_reconnecting() : ''}</p>

<div class="desktop:flex">
	<nav
		aria-label={m.course_space_channels({ courseCode: data.course.code })}
		class="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-surface-sidebar desktop:block"
	>
		<!-- The course banner, like a community banner atop a chat app's channel list. -->
		<div class="bg-(image:--banner) px-6 pt-6 pb-5 text-on-rail">
			<p class="font-mono text-sm font-semibold">{data.course.code}</p>
			<p class="mt-0.5 font-heading text-xl leading-snug font-bold">{data.course.title}</p>
			<p class="mt-1 text-sm">{data.course.institution.name}</p>
		</div>
		<ul class="mt-3 flex flex-col gap-1 px-3">
			{#each COURSE_CHANNELS as channel (channel)}
				{@const ChannelIcon = COURSE_CHANNEL_ICONS[channel]}
				<li>
					<a
						href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: data.course.id })}
						aria-current={channel === currentChannel ? 'page' : undefined}
						class="flex min-h-11 items-center gap-3 rounded-xl navigation-item px-3"
					>
						<ChannelIcon size={18} aria-hidden="true" />
						{COURSE_CHANNEL_LABELS[channel]()}
					</a>
				</li>
			{/each}
		</ul>
		<div class="mx-3 mt-3 border-t pt-3">
			<!-- The path is resolved; only the search query is added to it. -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={courseSearchUrl}
				class="flex min-h-11 items-center gap-3 rounded-xl navigation-item px-3"
			>
				<SearchIcon size={18} aria-hidden="true" />
				{m.course_space_search()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<div class="px-3">{@render reconnectingStatus()}</div>
		</div>
	</nav>

	<div class="min-w-0 flex-1">
		{#if isReadingThread && currentChannel}
			<!-- Threads keep the course header small so the post comes first, as in the thread designs. -->
			<header class="border-b bg-surface">
				<div class="mx-auto flex max-w-3xl items-center gap-2 px-2 py-2 desktop:px-4">
					<Button
						variant="ghost"
						size="icon"
						href={resolve(COURSE_CHANNEL_ROUTE_IDS[currentChannel], { courseId: data.course.id })}
						aria-label={m.course_space_back_to_channel({
							channel: COURSE_CHANNEL_LABELS[currentChannel]()
						})}><ChevronLeft size={24} /></Button
					>
					<p class="min-w-0 truncate">
						<span class="font-mono text-sm font-semibold text-primary">{data.course.code}</span>
						<span class="text-on-surface-variant">
							· {COURSE_CHANNEL_LABELS[currentChannel]()}</span
						>
					</p>
					<div class="ml-auto">{@render reconnectingStatus()}</div>
				</div>
			</header>
		{:else}
			<!--
				The sidebar banner already names the course on desktop, so there only Overview keeps a
				header, for the description and the course actions. Phones keep the name above the tabs.
			-->
			<header class={['bg-surface', isOverview ? 'border-b' : 'max-desktop:border-b']}>
				<div
					class={['mx-auto max-w-3xl px-4 pt-5 pb-4', isOverview ? 'desktop:py-6' : 'desktop:p-0']}
				>
					<div class="flex items-center justify-between gap-x-2 desktop:hidden">
						<p class="font-mono text-sm font-semibold text-primary">
							{data.course.code} · {data.course.institution.name}
						</p>
						<div class="-my-3 flex items-center gap-2">
							{@render reconnectingStatus()}
							<!-- An icon on phones, so the header doesn't gain a row there. -->
							<Button
								variant="text"
								size="compact"
								href={courseSearchUrl}
								class="max-tablet:size-11 max-tablet:px-0"
								><SearchIcon size={20} /><span class="sr-only tablet:not-sr-only"
									>{m.course_space_search()}</span
								></Button
							>
						</div>
					</div>
					<h1 class="mt-1 text-2xl leading-tight font-bold desktop:sr-only">
						{data.course.title}
					</h1>
					{#if isOverview}
						<p class="mt-2 text-on-surface-variant desktop:mt-0">{data.course.description}</p>
						<div class="mt-4 flex flex-wrap gap-2">
							<form
								method="POST"
								action={followActionUrl}
								use:enhance={() => {
									isFollowPending = true;
									return async ({ update }) => {
										try {
											await update();
										} finally {
											isFollowPending = false;
										}
									};
								}}
							>
								<Button
									variant={data.course.isFollowed ? 'tonal' : 'filled'}
									type="submit"
									disabled={isFollowPending}
									aria-busy={isFollowPending}
								>
									{#if data.course.isFollowed}<Check size={18} />
										{m.course_space_following()}{:else}{m.course_space_follow()}{/if}
								</Button>
							</form>
							<Button
								variant="outlined"
								onclick={() => {
									wasAddedToHistory = false;
									isHistoryEditorOpen = true;
								}}>{m.course_space_add_to_history()}</Button
							>
						</div>
						{#if page.form?.followingError}
							<p class="mt-2 text-sm" role="alert">{describeErrorCode(page.form.followingError)}</p>
						{/if}
						{#if wasAddedToHistory}
							<p class="mt-2 text-sm text-on-surface-variant" role="status">
								{m.course_space_added_to_history()}
							</p>
						{/if}
					{/if}
					<!-- Underlined tabs, as in Teams, so all four channels fit across a phone. -->
					<nav
						aria-label={m.course_space_channels_short()}
						class="-mx-4 mt-3 -mb-4 grid grid-cols-4 desktop:hidden"
					>
						{#each COURSE_CHANNELS as channel (channel)}
							<a
								href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: data.course.id })}
								aria-current={channel === currentChannel ? 'page' : undefined}
								class="relative flex min-h-12 items-center justify-center state-layer px-1 py-1 text-center text-sm font-semibold [overflow-wrap:anywhere] text-on-surface-variant transition-colors duration-150 focus-visible:-outline-offset-2 aria-[current=page]:font-bold aria-[current=page]:text-on-surface aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-t-full aria-[current=page]:after:bg-indicator"
								>{COURSE_CHANNEL_LABELS[channel]()}</a
							>
						{/each}
					</nav>
				</div>
			</header>
		{/if}
		<main class="mx-auto max-w-3xl px-4 py-4">
			{@render children()}
		</main>
	</div>
</div>

<HistoryEntryEditorDialog
	bind:open={isHistoryEditorOpen}
	presetCourse={historyCourse}
	onSaved={() => (wasAddedToHistory = true)}
/>
