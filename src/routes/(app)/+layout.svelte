<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { useClerkContext } from 'svelte-clerk';
	import { RealtimeConnection } from '#lib/client/realtime/RealtimeConnection.svelte.ts';
	import { setRealtimeConnectionAccessor } from '#lib/client/realtime/RealtimeConnectionContext.ts';
	import FloatingDock from '#lib/components/FloatingDock.svelte';
	import { PhoneDock, setPhoneDock } from '#lib/client/navigation/PhoneDock.svelte.ts';
	import SpaceRail from '#lib/components/SpaceRail.svelte';
	import { findCourseChannel } from '#lib/client/navigation/CourseChannel.ts';
	import { HotkeysProvider } from '@tanstack/svelte-hotkeys';
	import {
		KEYBOARD_SHORTCUTS,
		PAGE_SHORTCUT_SCOPE
	} from '#lib/client/hotkeys/KeyboardShortcuts.ts';
	import { setKeyboardShortcutsDialogOpener } from '#lib/client/hotkeys/KeyboardShortcutsDialogContext.ts';
	import KeyboardShortcutsDialog from '#lib/components/shortcuts/KeyboardShortcutsDialog.svelte';
	import PageNavigationShortcuts from '#lib/components/shortcuts/PageNavigationShortcuts.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const currentCourse = $derived(page.data.course ?? null);
	const currentChannel = $derived(findCourseChannel(page.route.id));
	const isExploreCurrent = $derived(page.route.id === '/(app)/explore');
	const isSearchCurrent = $derived(page.route.id === '/(app)/search');
	const isProfileCurrent = $derived(
		page.route.id === '/(app)/profile' || page.route.id === '/(app)/settings'
	);
	// Phones swap the dock for a thread's reply bar while one is on the page. Until the page is
	// interactive, the thread's data says whether it will be, so the dock doesn't flash.
	const phoneDock = new PhoneDock();
	setPhoneDock(phoneDock);
	let isHydrated = $state(false);
	onMount(() => (isHydrated = true));
	const isDockReplacedByReplyBar = $derived(
		isHydrated
			? phoneDock.isReplacedByReplyBar
			: page.params.postId !== undefined && page.data.post?.isLocked === false
	);
	const isAdministrator = $derived(data.currentUser?.role === 'administrator');

	const clerkContext = useClerkContext();
	const isSignedIn = $derived(clerkContext.isLoaded && clerkContext.session != null);
	const profile = $derived({
		...data.profile,
		imageUrl: clerkContext.user?.hasImage ? clerkContext.user.imageUrl : null
	});

	let isKeyboardShortcutsDialogOpen = $state(false);
	setKeyboardShortcutsDialogOpener({ open: () => (isKeyboardShortcutsDialogOpen = true) });

	let realtimeConnection = $state<RealtimeConnection | null>(null);
	setRealtimeConnectionAccessor(() => realtimeConnection);
	$effect(() => {
		if (!isSignedIn) return;
		const connection = new RealtimeConnection(
			async () => (await clerkContext.session?.getToken()) ?? null
		);
		realtimeConnection = connection;
		return () => {
			realtimeConnection = null;
			connection.close();
		};
	});
</script>

<HotkeysProvider appHotkeys={KEYBOARD_SHORTCUTS}>
	<KeyboardShortcutsDialog bind:open={isKeyboardShortcutsDialogOpen} />
	<HotkeysProvider scope={PAGE_SHORTCUT_SCOPE}>
		<PageNavigationShortcuts
			followedCourses={data.followedCourses}
			currentCourseId={currentCourse?.id ?? null}
			{currentChannel}
		/>
		<a
			href="#main-content"
			class="sr-only rounded-full bg-primary px-4 py-2 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
			>{m.navigation_skip_to_content()}</a
		>
		<div class="min-h-dvh desktop:flex">
			<div class="hidden desktop:block">
				<SpaceRail
					followedCourses={data.followedCourses}
					currentCourseId={currentCourse?.id ?? null}
					{isExploreCurrent}
					{isSearchCurrent}
					{isProfileCurrent}
					{isAdministrator}
					{profile}
				/>
			</div>
			<div
				id="main-content"
				tabindex="-1"
				class={[
					'min-w-0 flex-1 outline-none desktop:pb-0',
					!isDockReplacedByReplyBar && 'pb-[calc(7rem+env(safe-area-inset-bottom))]'
				]}
			>
				{@render children()}
			</div>
			<div class={['desktop:hidden', isDockReplacedByReplyBar && 'hidden']}>
				<FloatingDock
					followedCourses={data.followedCourses}
					{currentCourse}
					{currentChannel}
					{isExploreCurrent}
					{isSearchCurrent}
					{isProfileCurrent}
					{isAdministrator}
					{profile}
				/>
			</div>
		</div>
	</HotkeysProvider>
</HotkeysProvider>
