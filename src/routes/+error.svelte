<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import { m } from '#lib/paraglide/messages.js';

	const heading = $derived(
		page.status === 404
			? m.error_page_not_found()
			: page.status === 403
				? m.error_page_forbidden()
				: m.error_page_failed()
	);
	// Unexpected errors carry no code; their English message is for logs only.
	const description = $derived(
		page.error?.code ? describeErrorCode(page.error.code) : m.error_internal_error()
	);
</script>

<svelte:head><title>{heading}</title></svelte:head>

<main class="mx-auto max-w-2xl px-4 py-16">
	<p class="font-mono text-sm text-slate-600">{page.status}</p>
	<h1 class="mt-2 text-2xl font-semibold">{heading}</h1>
	<p class="mt-4">{description}</p>
	<a class="mt-6 inline-block font-semibold text-blue-700" href={resolve('/')}
		>{m.error_page_home()}</a
	>
</main>
