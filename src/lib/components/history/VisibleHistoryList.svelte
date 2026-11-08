<script lang="ts">
	import { resolve } from '$app/paths';
	import { groupHistoryEntries } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { VisibleHistoryEntryResponse } from '#lib/contracts/AcademicHistoryContract.ts';
	import HistoryCourseLabel from './HistoryCourseLabel.svelte';
	import HistoryStatusBadge from './HistoryStatusBadge.svelte';

	let { entries }: { entries: VisibleHistoryEntryResponse[] } = $props();

	const groups = $derived(groupHistoryEntries(entries));
</script>

<!-- The empty state reads the same whether someone has only private entries or none at all. -->
{#if groups.length === 0}
	<p class="mt-4 rounded-[20px] border bg-white p-4 text-slate-600">No courses to show.</p>
{:else}
	{#each groups as group (group.key)}
		<div class="mt-4 overflow-hidden rounded-[20px] border bg-white">
			<h3 class="border-b px-4 py-2 text-sm font-semibold tracking-wide uppercase">
				{group.heading}
			</h3>
			<ul class="divide-y">
				{#each group.entries as entry (entry.id)}
					<li>
						<a
							href={resolve('/(app)/courses/[courseId]', { courseId: entry.course.id })}
							class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
						>
							<HistoryCourseLabel course={entry.course} />
							<HistoryStatusBadge status={entry.status} />
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
{/if}
