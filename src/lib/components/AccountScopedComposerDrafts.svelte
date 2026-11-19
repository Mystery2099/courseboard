<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { ComposerDrafts, setComposerDrafts } from '#lib/client/content/ComposerDrafts.svelte.ts';

	let { children }: { children: Snippet } = $props();

	const clerkContext = useClerkContext();
	// The server's auth state names the account before Clerk loads, so drafts open on first render.
	const composerDrafts = new ComposerDrafts(() => clerkContext.auth.userId ?? null);
	setComposerDrafts(composerDrafts);

	// Drafts belong to one account. Once Clerk knows who is signed in, anyone else's drafts are
	// removed, including after a sign-out or switch that happened while the page was closed.
	$effect(() => {
		if (!clerkContext.isLoaded) return;
		composerDrafts.keepOnlyAccount(clerkContext.auth.userId ?? null);
	});
</script>

{@render children()}
