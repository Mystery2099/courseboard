<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import Compass from 'lucide-svelte/icons/compass';
	import { UserButton } from 'svelte-clerk';
	import type { FollowedCourseResponse } from '#lib/contracts/CourseFollowingContract.ts';
	import {
		COURSE_CHANNELS,
		COURSE_CHANNEL_LABELS,
		COURSE_CHANNEL_ROUTE_IDS,
		type CourseChannel
	} from '#lib/navigation/CourseChannel.ts';
	import CourseCodeTile from './CourseCodeTile.svelte';

	let {
		followedCourses,
		currentCourse,
		currentChannel,
		isAdministrator
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourse: { id: string; code: string } | null;
		currentChannel: CourseChannel | null;
		isAdministrator: boolean;
	} = $props();

	let switcherSheet: HTMLDialogElement;

	afterNavigate(() => switcherSheet?.close());
</script>

<nav
	aria-label="Main"
	class="fixed inset-x-3 bottom-3 mx-auto flex h-[60px] max-w-[560px] items-center gap-2 rounded-full border bg-white px-2 shadow-lg"
>
	<a
		href={resolve('/(app)/explore')}
		aria-label="Explore"
		class="flex size-11 items-center justify-center rounded-full"
	>
		<Compass size={22} />
	</a>
	<button
		type="button"
		class="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-sky-100 px-4 text-left"
		aria-current={currentCourse ? 'page' : undefined}
		aria-haspopup="dialog"
		onclick={() => switcherSheet.showModal()}
	>
		{#if currentCourse}
			<span class="font-mono text-sm font-semibold">{currentCourse.code}</span>
			<span class="truncate">{currentChannel ? COURSE_CHANNEL_LABELS[currentChannel] : ''}</span>
		{:else}
			<span>Spaces</span>
		{/if}
		<ChevronUp size={18} class="ml-auto shrink-0" />
	</button>
	<span class="flex size-11 items-center justify-center"><UserButton /></span>
</nav>

<dialog
	bind:this={switcherSheet}
	aria-label="Switch space"
	class="mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-none rounded-t-[28px] bg-white p-4 pb-8 backdrop:bg-slate-900/50"
	onclick={(event) => event.target === switcherSheet && switcherSheet.close()}
>
	<h2 class="text-xs font-semibold tracking-wider text-slate-600 uppercase">Your courses</h2>
	{#if followedCourses.length === 0}
		<p class="mt-2 text-sm text-slate-600">Courses you follow appear here.</p>
	{:else}
		<ul class="mt-2 flex gap-3 overflow-x-auto pb-2">
			{#each followedCourses as course (course.id)}
				<li>
					<a
						href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
						aria-label="{course.code} {course.title}"
						aria-current={course.id === currentCourse?.id ? 'page' : undefined}
						class="flex w-16 flex-col items-center gap-1 text-xs"
					>
						<CourseCodeTile code={course.code} isCurrent={course.id === currentCourse?.id} />
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if currentCourse}
		<h2 class="mt-4 text-xs font-semibold tracking-wider text-slate-600 uppercase">
			In {currentCourse.code}
		</h2>
		<ul class="mt-1">
			{#each COURSE_CHANNELS as channel (channel)}
				<li>
					<a
						href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: currentCourse.id })}
						aria-current={channel === currentChannel ? 'page' : undefined}
						class={[
							'block rounded-xl px-4 py-3',
							channel === currentChannel && 'bg-indigo-100 font-semibold'
						]}>{COURSE_CHANNEL_LABELS[channel]}</a
					>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="mt-4 flex flex-col items-center gap-2">
		<a href={resolve('/(app)/explore')} class="font-semibold text-blue-700">Explore all courses</a>
		{#if isAdministrator}
			<a href={resolve('/(app)/admin/invitations')} class="text-sm">Admin</a>
		{/if}
	</div>
</dialog>
