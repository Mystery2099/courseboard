<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Course catalog</h1>
<p class="mt-2 text-sm opacity-70">
	Adds fictional institutions and courses for development and demonstrations. Entries that already
	exist are left unchanged, so this is safe to repeat.
</p>

<form method="POST" action="?/loadDemoCatalog" use:enhance class="mt-6">
	<button type="submit" class="rounded border px-4 py-1">Load demo catalog</button>
</form>
{#if form?.demoCatalogLoad}
	<p class="mt-4 text-sm" role="status">
		Added {form.demoCatalogLoad.institutionsCreated} institutions and
		{form.demoCatalogLoad.coursesCreated} courses.
	</p>
{/if}
