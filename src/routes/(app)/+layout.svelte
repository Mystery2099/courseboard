<script lang="ts">
	import { page } from '$app/state';
	import { useClerkContext } from 'svelte-clerk';
	import { RealtimeConnection } from '#lib/realtime/RealtimeConnection.svelte.ts';
	import FloatingDock from '#lib/components/FloatingDock.svelte';
	import SpaceRail from '#lib/components/SpaceRail.svelte';
	import { findCourseChannel } from '#lib/navigation/CourseChannel.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const currentCourse = $derived(page.data.course ?? null);
	const currentChannel = $derived(findCourseChannel(page.route.id));
	const isAdministrator = $derived(data.currentUser?.role === 'administrator');

	const clerkContext = useClerkContext();
	const isSignedIn = $derived(clerkContext.isLoaded && clerkContext.session != null);

	$effect(() => {
		if (!isSignedIn) return;
		const realtimeConnection = new RealtimeConnection(
			async () => (await clerkContext.session?.getToken()) ?? null
		);
		return () => realtimeConnection.close();
	});
</script>

<div class="min-h-dvh desktop:flex">
	<div class="hidden desktop:block">
		<SpaceRail
			followedCourses={data.followedCourses}
			currentCourseId={currentCourse?.id ?? null}
			isExploreCurrent={page.route.id === '/(app)/explore'}
			{isAdministrator}
		/>
	</div>
	<div class="min-w-0 flex-1 pb-24 desktop:pb-0">
		{@render children()}
	</div>
	<div class="desktop:hidden">
		<FloatingDock
			followedCourses={data.followedCourses}
			{currentCourse}
			{currentChannel}
			{isAdministrator}
		/>
	</div>
</div>
