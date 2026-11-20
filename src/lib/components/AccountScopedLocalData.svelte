<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { AccountLocalData, setAccountLocalData } from '#lib/client/AccountLocalData.ts';

	let { children }: { children: Snippet } = $props();

	const clerkContext = useClerkContext();
	// The server's auth state names the account before Clerk loads, so drafts open as soon as the
	// page is interactive. Derived, so Clerk's frequent auth updates only matter when the id changes.
	const accountId = $derived(clerkContext.auth.userId ?? null);
	const accountLocalData = new AccountLocalData(
		() => accountId,
		() => clerkContext.isLoaded
	);
	setAccountLocalData(accountLocalData);

	// Local data belongs to one account. Once Clerk knows who is signed in, anyone else's is removed,
	// including after a sign-out or switch that happened while the page was closed.
	$effect(() => {
		if (clerkContext.isLoaded) accountLocalData.keepOnlyAccount(accountId);
	});

	// Another tab publishing or editing the same draft updates it here too. Storage events only come
	// from other tabs.
	$effect(() => {
		const reloadOpenDrafts = (event: StorageEvent) =>
			accountLocalData.composerDrafts.reloadOpenDrafts(event.key);
		window.addEventListener('storage', reloadOpenDrafts);
		return () => window.removeEventListener('storage', reloadOpenDrafts);
	});
</script>

{@render children()}
