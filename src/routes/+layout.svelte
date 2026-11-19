<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { ClerkProvider } from 'svelte-clerk';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/env';
	import AccountScopedQueryCache from '#lib/components/AccountScopedQueryCache.svelte';
	import AccountScopedComposerDrafts from '#lib/components/AccountScopedComposerDrafts.svelte';
	import { CLERK_LOCALIZATIONS } from '#lib/client/ClerkLocalization.ts';
	import { getLocale } from '#lib/paraglide/runtime.js';
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

<!-- Changing the language reloads the page, so the localization is read once. -->
<ClerkProvider telemetry={{ disabled: true }} localization={CLERK_LOCALIZATIONS[getLocale()]}>
	<QueryClientProvider client={queryClient}>
		<AccountScopedQueryCache>
			<AccountScopedComposerDrafts>
				{@render children()}
			</AccountScopedComposerDrafts>
		</AccountScopedQueryCache>
	</QueryClientProvider>
</ClerkProvider>
