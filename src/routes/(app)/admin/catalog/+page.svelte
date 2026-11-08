<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Course catalog</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-2xl font-semibold">Course catalog</h1>
	<form method="POST" action="?/loadDemoCatalog" use:enhance>
		<button type="submit" class="rounded-full bg-blue-700 px-5 py-2 font-semibold text-white">
			Load demo catalog
		</button>
	</form>
</div>
<p class="mt-2 text-sm text-slate-600">
	The demo catalog adds Alfred State College and two fictional schools, with their courses. Entries
	that already exist are left unchanged, so it's safe to load again.
</p>
{#if form?.demoCatalogLoad}
	<p class="mt-4 text-sm" role="status">
		Added {form.demoCatalogLoad.institutionsCreated} institutions and
		{form.demoCatalogLoad.coursesCreated} courses.
	</p>
{/if}
{#if data.hasMoreCourses}
	<p class="mt-4 text-sm" role="alert">Only the first {data.courses.length} courses are shown.</p>
{/if}

<div class="mt-6 overflow-x-auto rounded-[20px] border bg-white">
	<table class="w-full text-left text-sm">
		<thead class="text-xs tracking-wider text-slate-600 uppercase">
			<tr><th class="px-4 py-3">Code</th><th class="px-4">Name</th><th class="px-4">School</th></tr>
		</thead>
		<tbody>
			{#each data.courses as course (course.id)}
				<tr class="border-t">
					<td class="px-4 py-3 font-mono font-semibold whitespace-nowrap">{course.code}</td>
					<td class="px-4">{course.title}</td>
					<td class="px-4 text-slate-600">{course.institutionName}</td>
				</tr>
			{:else}
				<tr><td colspan="3" class="px-4 py-3 text-slate-600">No courses yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
