<script lang="ts">
	import { buttonClass } from '#lib/components/ui/ControlStyles.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.admin_section_catalog()}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-2xl font-semibold">{m.admin_section_catalog()}</h1>
	<form method="POST" action="?/loadDemoCatalog" use:enhance>
		<button type="submit" class={buttonClass('filled')}>
			{m.onboarding_load_demo_catalog()}
		</button>
	</form>
</div>
<p class="mt-2 text-sm text-on-surface-variant">
	{m.admin_catalog_demo_explanation()}
</p>
{#if form?.demoCatalogLoad}
	<p class="mt-4 text-sm" role="status">
		{m.admin_catalog_demo_loaded({
			institutionCount: form.demoCatalogLoad.institutionsCreated,
			courseCount: form.demoCatalogLoad.coursesCreated
		})}
	</p>
{/if}
{#if data.hasMoreCourses}
	<p class="mt-4 text-sm" role="alert">
		{m.admin_catalog_truncated({ count: data.courses.length })}
	</p>
{/if}

<div class="mt-6 overflow-x-auto rounded-card border bg-surface">
	<table class="w-full text-left text-sm">
		<thead class="text-xs tracking-wider text-on-surface-variant uppercase">
			<tr>
				<th class="px-4 py-3">{m.admin_catalog_code()}</th>
				<th class="px-4">{m.admin_catalog_name()}</th>
				<th class="px-4">{m.admin_catalog_school()}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.courses as course (course.id)}
				<tr class="border-t">
					<td class="px-4 py-3 font-mono font-semibold whitespace-nowrap">{course.code}</td>
					<td class="px-4">{course.title}</td>
					<td class="px-4 text-on-surface-variant">{course.institutionName}</td>
				</tr>
			{:else}
				<tr
					><td colspan="3" class="px-4 py-3 text-on-surface-variant">{m.admin_catalog_empty()}</td
					></tr
				>
			{/each}
		</tbody>
	</table>
</div>
