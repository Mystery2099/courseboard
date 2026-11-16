<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
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
	<p class="mt-4 rounded-card border bg-surface p-4 text-on-surface-variant">
		{m.history_visible_empty()}
	</p>
{:else}
	{#each groups as group (group.key)}
		<div class="mt-4 overflow-hidden rounded-card border bg-surface">
			<h3 class="border-b px-4 py-3 text-overline text-on-surface-variant">
				{group.heading}
			</h3>
			<ul class="divide-y">
				{#each group.entries as entry (entry.id)}
					<li>
						<a
							href={resolve('/(app)/courses/[courseId]', { courseId: entry.course.id })}
							class="flex min-h-16 items-center gap-3 state-layer px-4 py-3 transition-colors duration-150 [--state-base:var(--surface)]"
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
