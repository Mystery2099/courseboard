<script lang="ts">
	import { tick } from 'svelte';
	import { createHotkey } from '@tanstack/svelte-hotkeys';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { KEYBOARD_SHORTCUTS } from '#lib/client/hotkeys/KeyboardShortcuts.ts';
	import {
		COURSE_CHANNELS,
		COURSE_CHANNEL_ROUTE_IDS,
		type CourseChannel
	} from '#lib/client/navigation/CourseChannel.ts';
	import { SEARCH_QUERY_FIELD_ID } from '#lib/client/navigation/SearchField.ts';
	import type { FollowedCourseResponse } from '#lib/contracts/CourseFollowingContract.ts';

	let {
		followedCourses,
		currentCourseId,
		currentChannel
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourseId: string | null;
		currentChannel: CourseChannel | null;
	} = $props();

	/** The item `offset` steps from the current one, wrapping around; the first or last without one. */
	function findNeighbor<T>(items: readonly T[], currentIndex: number, offset: 1 | -1): T {
		if (currentIndex === -1) return items[offset === 1 ? 0 : items.length - 1];
		return items[(currentIndex + offset + items.length) % items.length];
	}

	async function openSearch() {
		if (page.route.id !== '/(app)/search') await goto(resolve('/(app)/search'));
		await tick();
		document.getElementById(SEARCH_QUERY_FIELD_ID)?.focus();
	}

	function moveToFollowedCourse(offset: 1 | -1) {
		const currentIndex = followedCourses.findIndex((course) => course.id === currentCourseId);
		const course = findNeighbor(followedCourses, currentIndex, offset);
		void goto(resolve('/(app)/courses/[courseId]', { courseId: course.id }));
	}

	function moveToChannel(offset: 1 | -1) {
		if (!currentCourseId || !currentChannel) return;
		const channel = findNeighbor(COURSE_CHANNELS, COURSE_CHANNELS.indexOf(currentChannel), offset);
		void goto(resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId: currentCourseId }));
	}

	const hasFollowedCourses = () => ({ enabled: followedCourses.length > 0 });
	const isInCourse = () => ({ enabled: currentCourseId !== null && currentChannel !== null });

	createHotkey(KEYBOARD_SHORTCUTS['navigation.search'], () => void openSearch());
	createHotkey(
		KEYBOARD_SHORTCUTS['navigation.previousCourse'],
		() => moveToFollowedCourse(-1),
		hasFollowedCourses
	);
	createHotkey(
		KEYBOARD_SHORTCUTS['navigation.nextCourse'],
		() => moveToFollowedCourse(1),
		hasFollowedCourses
	);
	createHotkey(
		KEYBOARD_SHORTCUTS['navigation.previousChannel'],
		() => moveToChannel(-1),
		isInCourse
	);
	createHotkey(KEYBOARD_SHORTCUTS['navigation.nextChannel'], () => moveToChannel(1), isInCourse);
</script>
