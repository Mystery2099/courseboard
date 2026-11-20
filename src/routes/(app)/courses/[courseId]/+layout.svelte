<script lang="ts">
	import { toggleVariants } from '#lib/components/ui/toggle/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Check from 'lucide-svelte/icons/check';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import HistoryEntryEditorDialog from '#lib/components/history/HistoryEntryEditorDialog.svelte';
	import {
		COURSE_CHANNELS,
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

	const queryClient = useQueryClient();
	const getRealtimeConnection = getRealtimeConnectionAccessor();
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
	const followActionUrl = $derived(
		`${resolve('/(app)/courses/[courseId]', { courseId: data.course.id })}?/${data.course.isFollowed ? 'unfollow' : 'follow'}`
	);
</script>

<svelte:head><title>{data.course.code} · {data.course.title}</title></svelte:head>

<div class="desktop:flex">
	<nav
		aria-label={m.course_space_channels({ courseCode: data.course.code })}
		class="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-surface-sidebar px-3 py-6 desktop:block"
	>
		<p class="px-3 font-mono text-sm font-semibold text-primary">{data.course.code}</p>
		<p class="mt-0.5 px-3 font-heading text-lg leading-snug font-bold">{data.course.title}</p>
		<ul class="mt-6 flex flex-col gap-1">
			{#each COURSE_CHANNELS as channel (channel)}
				<li>
					<a
						href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: data.course.id })}
						aria-current={channel === currentChannel ? 'page' : undefined}
						class="flex min-h-11 items-center rounded-xl navigation-item px-3"
						>{COURSE_CHANNEL_LABELS[channel]()}</a
					>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="min-w-0 flex-1">
		{#if isReadingThread && currentChannel}
			<!-- Threads keep the course header small so the post comes first, as in the thread designs. -->
			<header class="border-b bg-blueprint-grid">
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
				</div>
			</header>
		{:else}
			<header class="border-b bg-blueprint-grid">
				<div class="mx-auto max-w-3xl px-4 pt-8 pb-4 desktop:pb-6">
					<p class="font-mono text-sm font-semibold text-primary">
						{data.course.code} · {data.course.institution.name}
					</p>
					<h1 class="mt-1 text-headline font-bold">{data.course.title}</h1>
					<p class="mt-2 text-on-surface-variant">{data.course.description}</p>
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
					<nav
						aria-label={m.course_space_channels_short()}
						class="mt-2.5 flex flex-wrap gap-2 py-1.5 desktop:hidden"
					>
						{#each COURSE_CHANNELS as channel (channel)}
							<a
								href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: data.course.id })}
								aria-current={channel === currentChannel ? 'page' : undefined}
								class={toggleVariants({ variant: 'chip' })}>{COURSE_CHANNEL_LABELS[channel]()}</a
							>
						{/each}
					</nav>
				</div>
			</header>
		{/if}
		<main class="mx-auto max-w-3xl px-4 py-6">
			{@render children()}
		</main>
	</div>
</div>

<HistoryEntryEditorDialog
	bind:open={isHistoryEditorOpen}
	presetCourse={historyCourse}
	onSaved={() => (wasAddedToHistory = true)}
/>
