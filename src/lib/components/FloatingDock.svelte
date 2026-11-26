<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import Check from 'lucide-svelte/icons/check';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import AtSign from 'lucide-svelte/icons/at-sign';
	import Compass from 'lucide-svelte/icons/compass';
	import Search from 'lucide-svelte/icons/search';
	import type { FollowedCourseResponse } from '#lib/contracts/CourseFollowingContract.ts';
	import {
		COURSE_CHANNELS,
		COURSE_CHANNEL_LABELS,
		COURSE_CHANNEL_ROUTE_IDS,
		type CourseChannel
	} from '#lib/client/navigation/CourseChannel.ts';
	import { navigateToAdjacentCourseChannel } from '#lib/client/navigation/CourseChannelNavigation.ts';
	import {
		horizontalSwipe,
		type SwipeDirection
	} from '#lib/client/gestures/HorizontalSwipeGesture.ts';
	import CourseCodeTile from './CourseCodeTile.svelte';
	import UserAvatar from './UserAvatar.svelte';

	let {
		followedCourses,
		currentCourse,
		currentChannel,
		isExploreCurrent,
		isSearchCurrent,
		isMentionsCurrent,
		isProfileCurrent,
		isAdministrator,
		profile
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourse: { id: string; code: string } | null;
		currentChannel: CourseChannel | null;
		isExploreCurrent: boolean;
		isSearchCurrent: boolean;
		isMentionsCurrent: boolean;
		isProfileCurrent: boolean;
		isAdministrator: boolean;
		profile: { username: string; displayName: string; imageUrl: string | null };
	} = $props();

	let isSwitcherOpen = $state(false);

	afterNavigate(() => (isSwitcherOpen = false));

	const isInCourseChannel = $derived(currentCourse !== null && currentChannel !== null);

	// Like turning a page: the finger moving left brings the next channel in.
	function moveToChannelInSwipeDirection(direction: SwipeDirection) {
		if (!currentCourse || !currentChannel) return;
		navigateToAdjacentCourseChannel(
			currentCourse.id,
			currentChannel,
			direction === 'left' ? 1 : -1
		);
	}
</script>

<!--
	One-row dock (design handoff): 60px tall, floating 24px above the bottom on tall phones. Icons only
	on phones; tablets show labels, which the accessible names contain. Below 400px, Mentions moves into
	the switcher so the course code still fits.
-->
<nav
	aria-label={m.navigation_main()}
	class="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-40 mx-auto flex h-[60px] max-w-[560px] items-center gap-1 rounded-full border bg-surface px-1.5 shadow-floating [@media(min-height:700px)]:bottom-[calc(24px+env(safe-area-inset-bottom))]"
>
	<a
		href={resolve('/(app)/explore')}
		aria-label={m.navigation_explore()}
		aria-current={isExploreCurrent ? 'page' : undefined}
		class="flex size-12 shrink-0 items-center justify-center gap-2 rounded-full navigation-item text-on-surface tablet:w-auto tablet:px-3"
	>
		<Compass size={24} />
		<span class="hidden text-sm font-semibold tablet:inline">{m.navigation_explore()}</span>
	</a>
	<Drawer.Root bind:open={isSwitcherOpen}>
		<Drawer.Trigger
			{@attach isInCourseChannel ? horizontalSwipe(moveToChannelInSwipeDirection) : null}
			class={[
				'flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full state-layer bg-primary-container px-4 text-left text-on-primary-container transition-colors duration-150 [--state-base:var(--primary-container)] [--state-color:var(--on-primary-container)]',
				isInCourseChannel && 'touch-pan-y touch-pinch-zoom'
			]}
			aria-current={currentCourse ? 'page' : undefined}
		>
			{#if currentCourse}
				<span class="shrink-0 font-mono text-sm font-semibold whitespace-nowrap"
					>{currentCourse.code}</span
				>
				{#if currentChannel}
					<!-- Code only on the narrowest phones; the channel stays in the accessible name. -->
					<span class="truncate text-sm max-[399px]:sr-only"
						>{COURSE_CHANNEL_LABELS[currentChannel]()}</span
					>
				{/if}
			{:else}
				<span class="font-semibold">{m.navigation_spaces()}</span>
			{/if}
			<ChevronUp size={20} class="ml-auto shrink-0" />
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="overflow-y-auto px-4 pt-4">
				<Drawer.Title class="text-overline font-bold text-on-surface-variant"
					>{m.navigation_your_courses()}</Drawer.Title
				>
				{#if followedCourses.length === 0}
					<p class="mt-2 text-sm text-on-surface-variant">
						{m.navigation_followed_courses_empty()}
					</p>
				{:else}
					<ul class="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
						{#each followedCourses as course (course.id)}
							<li>
								<a
									href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
									aria-label="{course.code} {course.title}"
									aria-current={course.id === currentCourse?.id ? 'page' : undefined}
									class="group/tile block rounded-tile p-1"
								>
									<CourseCodeTile code={course.code} isCurrent={course.id === currentCourse?.id} />
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				{#if currentCourse}
					<h2 class="mt-5 text-overline text-on-surface-variant">
						{m.navigation_in_course({ courseCode: currentCourse.code })}
					</h2>
					<ul class="mt-2">
						{#each COURSE_CHANNELS as channel (channel)}
							<li>
								<a
									href={resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: currentCourse.id })}
									aria-current={channel === currentChannel ? 'page' : undefined}
									class="flex min-h-12 items-center gap-2 rounded-2xl navigation-item px-4 text-lg"
								>
									{COURSE_CHANNEL_LABELS[channel]()}
									{#if channel === currentChannel}<Check size={18} aria-hidden="true" />{/if}
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="mt-5 flex flex-col items-center gap-1">
					<Button href={resolve('/(app)/explore')} variant="text"
						>{m.navigation_explore_all_courses()}</Button
					>
					<!-- The narrowest phones have no room for Mentions in the dock itself. -->
					<Button
						href={resolve('/(app)/mentions')}
						variant="text"
						class="min-[400px]:hidden"
						aria-current={isMentionsCurrent ? 'page' : undefined}>{m.navigation_mentions()}</Button
					>
					{#if isAdministrator}
						<Button href={resolve('/(app)/admin/invitations')} variant="text" size="compact"
							>{m.navigation_admin()}</Button
						>
					{/if}
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Root>
	<a
		href={resolve('/(app)/search')}
		aria-label={m.navigation_search()}
		aria-current={isSearchCurrent ? 'page' : undefined}
		class="flex size-12 shrink-0 items-center justify-center gap-2 rounded-full navigation-item text-on-surface tablet:w-auto tablet:px-3"
	>
		<Search size={24} />
		<span class="hidden text-sm font-semibold tablet:inline">{m.navigation_search()}</span>
	</a>
	<a
		href={resolve('/(app)/mentions')}
		aria-label={m.navigation_mentions()}
		aria-current={isMentionsCurrent ? 'page' : undefined}
		class="flex size-12 shrink-0 items-center justify-center gap-2 rounded-full navigation-item text-on-surface max-[399px]:hidden tablet:w-auto tablet:px-3"
	>
		<AtSign size={24} />
		<span class="hidden text-sm font-semibold tablet:inline">{m.navigation_mentions()}</span>
	</a>
	<a
		href={resolve('/(app)/profile')}
		aria-label={m.navigation_your_profile()}
		aria-current={isProfileCurrent ? 'page' : undefined}
		class="flex size-12 shrink-0 items-center justify-center gap-2 rounded-full navigation-item text-on-surface tablet:w-auto tablet:pr-3 tablet:pl-1.5"
	>
		<UserAvatar
			username={profile.username}
			displayName={profile.displayName}
			imageUrl={profile.imageUrl}
			size={32}
		/>
		<span class="hidden text-sm font-semibold tablet:inline">{m.navigation_profile()}</span>
	</a>
</nav>
