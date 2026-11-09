<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { ClerkProvider } from 'svelte-clerk';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/env';
	import AccountScopedQueryCache from '#lib/components/AccountScopedQueryCache.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// One client per browser session; SSR gets a fresh client per request.
	const queryClient = new QueryClient({
		defaultOptions: { queries: { enabled: browser, staleTime: 30_000 } }
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ClerkProvider telemetry={{ disabled: true }}>
	<QueryClientProvider client={queryClient}>
		<AccountScopedQueryCache>
			{@render children()}
		</AccountScopedQueryCache>
	</QueryClientProvider>
</ClerkProvider>
