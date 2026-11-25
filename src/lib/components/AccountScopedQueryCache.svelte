<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { useClerkContext } from 'svelte-clerk';
	import { PostListReadingPositions } from '#lib/client/navigation/PostListReadingPosition.ts';

	let { children }: { children: Snippet } = $props();

	const clerkContext = useClerkContext();
	const queryClient = useQueryClient();

	// Cached data and list reading positions belong to one account. Signing out or switching accounts
	// empties both, so the next account never sees, even briefly, what the previous one loaded.
	let cachedAccountId: string | null | undefined;
	$effect(() => {
		if (!clerkContext.isLoaded) return;
		const accountId = clerkContext.user?.id ?? null;
		if (cachedAccountId !== undefined && cachedAccountId !== accountId) {
			queryClient.clear();
			PostListReadingPositions.clear();
		}
		cachedAccountId = accountId;
	});
</script>

{@render children()}
