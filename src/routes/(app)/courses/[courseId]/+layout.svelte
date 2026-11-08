<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Check from 'lucide-svelte/icons/check';
	import HistoryEntryEditorDialog from '#lib/components/history/HistoryEntryEditorDialog.svelte';
	import {
		COURSE_CHANNELS,
		COURSE_CHANNEL_LABELS,
		COURSE_CHANNEL_ROUTE_IDS,
		findCourseChannel
	} from '#lib/navigation/CourseChannel.ts';
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

	// Recorded from the browser after the space renders, so hover preloads don't count as visits.
	$effect(() => {
		void fetch(`/api/courses/${data.course.id}/visit`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: '{}'
		}).catch(() => undefined);
	});
	const followActionUrl = $derived(
		`${resolve('/(app)/courses/[courseId]', { courseId: data.course.id })}?/${data.course.isFollowed ? 'unfollow' : 'follow'}`
	);
</script>

<svelte:head><title>{data.course.code} · {data.course.title}</title></svelte:head>

<div class="desktop:flex">
	<nav
		aria-label="{data.course.code} channels"
		class="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-slate-50 px-3 py-6 desktop:block"
	>
		<p class="px-3 font-mono text-sm font-semibold text-blue-700">{data.course.code}</p>
		<p class="px-3 font-semibold">{data.course.title}</p>
		<ul class="mt-6 flex flex-col gap-1">
			{#each COURSE_CHANNELS as channel (channel)}
				<li>
					<a
						href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: data.course.id })}
						aria-current={channel === currentChannel ? 'page' : undefined}
						class={[
							'block rounded-xl px-3 py-2',
							channel === currentChannel && 'bg-indigo-100 font-semibold'
						]}>{COURSE_CHANNEL_LABELS[channel]}</a
					>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="min-w-0 flex-1">
		<header class="mx-auto max-w-3xl px-4 pt-8">
			<p class="font-mono text-sm font-semibold text-blue-700">
				{data.course.code} · {data.course.institution.name}
			</p>
			<h1 class="mt-1 text-3xl font-semibold">{data.course.title}</h1>
			<p class="mt-2 text-slate-700">{data.course.description}</p>
			<div class="mt-4 flex flex-wrap gap-2">
				<form method="POST" action={followActionUrl} use:enhance>
					<button
						type="submit"
						class={[
							'inline-flex items-center gap-1 rounded-full px-5 py-2 font-semibold',
							data.course.isFollowed ? 'bg-indigo-100' : 'bg-blue-700 text-white'
						]}
					>
						{#if data.course.isFollowed}<Check size={18} /> Following{:else}Follow{/if}
					</button>
				</form>
				<button
					type="button"
					class="rounded-full border px-5 py-2"
					onclick={() => {
						wasAddedToHistory = false;
						isHistoryEditorOpen = true;
					}}>Add to my history</button
				>
			</div>
			{#if page.form?.followingError}
				<p class="mt-2 text-sm" role="alert">{page.form.followingError}</p>
			{/if}
			{#if wasAddedToHistory}
				<p class="mt-2 text-sm text-slate-600" role="status">
					Added to your history. Following is separate and hasn't changed.
				</p>
			{/if}
			<nav aria-label="Channels" class="mt-4 flex gap-2 overflow-x-auto desktop:hidden">
				{#each COURSE_CHANNELS as channel (channel)}
					<a
						href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: data.course.id })}
						aria-current={channel === currentChannel ? 'page' : undefined}
						class={[
							'shrink-0 rounded-full border px-4 py-1.5',
							channel === currentChannel && 'border-transparent bg-indigo-100 font-semibold'
						]}>{COURSE_CHANNEL_LABELS[channel]}</a
					>
				{/each}
			</nav>
		</header>
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
