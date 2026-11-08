<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { useClerkContext } from 'svelte-clerk';

	let { children }: { children: Snippet } = $props();

	const clerkContext = useClerkContext();
	const queryClient = useQueryClient();

	// Cached data belongs to one account. Signing out or switching accounts empties the cache, so the
	// next account never sees, even briefly, what the previous one loaded.
	let cachedAccountId: string | null | undefined;
	$effect(() => {
		if (!clerkContext.isLoaded) return;
		const accountId = clerkContext.user?.id ?? null;
		if (cachedAccountId !== undefined && cachedAccountId !== accountId) queryClient.clear();
		cachedAccountId = accountId;
	});
</script>

{@render children()}
