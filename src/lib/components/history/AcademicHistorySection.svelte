<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import Plus from 'lucide-svelte/icons/plus';
	import {
		AcademicHistoryApiClient,
		academicHistoryQueryKeys
	} from '#lib/client/history/AcademicHistoryApiClient.ts';
	import { groupHistoryEntries } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type {
		OwnHistoryEntryResponse,
		OwnHistoryResponse
	} from '#lib/contracts/AcademicHistoryContract.ts';
	import HistoryCourseLabel from './HistoryCourseLabel.svelte';
	import HistoryEntryEditorDialog from './HistoryEntryEditorDialog.svelte';
	import HistoryStatusBadge from './HistoryStatusBadge.svelte';
	import VisibleHistoryList from './VisibleHistoryList.svelte';

	let {
		initialHistory,
		initialHistoryLoadedAt,
		username,
		primaryInstitutionId
	}: {
		initialHistory: OwnHistoryResponse;
		initialHistoryLoadedAt: number;
		username: string;
		primaryInstitutionId: string;
	} = $props();

	// The server render seeds the cache; from then on the query owns this data.
	const ownHistoryQuery = createQuery(() => ({
		queryKey: academicHistoryQueryKeys.own(),
		queryFn: AcademicHistoryApiClient.listOwnEntries,
		initialData: initialHistory,
		initialDataUpdatedAt: initialHistoryLoadedAt
	}));

	let isPreviewingAsOthers = $state(false);

	// Preview uses the same endpoint other students do, so it shows exactly what they would see.
	const visibleHistoryQuery = createQuery(() => ({
		queryKey: academicHistoryQueryKeys.visible(username),
		queryFn: () => AcademicHistoryApiClient.listVisibleEntries(username),
		enabled: isPreviewingAsOthers
	}));

	let isEditorOpen = $state(false);
	let editedEntry = $state<OwnHistoryEntryResponse | null>(null);

	function openEditor(entry: OwnHistoryEntryResponse | null) {
		editedEntry = entry;
		isEditorOpen = true;
	}

	const ownGroups = $derived(groupHistoryEntries(ownHistoryQuery.data.entries));
</script>

<section class="mt-8" aria-labelledby="history-heading">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 id="history-heading" class="text-xl font-semibold">History</h2>
		<div class="flex gap-2">
			<button
				type="button"
				class={[
					'rounded-full border px-4 py-1.5',
					isPreviewingAsOthers && 'border-transparent bg-indigo-100 font-semibold'
				]}
				aria-pressed={isPreviewingAsOthers}
				onclick={() => (isPreviewingAsOthers = !isPreviewingAsOthers)}>Preview as others</button
			>
			{#if !isPreviewingAsOthers}
				<button
					type="button"
					class="inline-flex items-center gap-1 rounded-full bg-blue-700 px-4 py-1.5 font-semibold text-white"
					onclick={() => openEditor(null)}><Plus size={18} /> Add course</button
				>
			{/if}
		</div>
	</div>

	{#if isPreviewingAsOthers}
		<p class="mt-2 text-sm text-slate-600">
			This is what other students see. Private entries and notes are left out.
			<a class="font-semibold text-blue-700" href={resolve('/(app)/users/[username]', { username })}
				>Open your profile page</a
			>
		</p>
		{#if visibleHistoryQuery.isPending}
			<p class="mt-4 text-sm text-slate-600">Loading preview…</p>
		{:else if visibleHistoryQuery.isError}
			<p class="mt-4 text-sm text-red-700" role="alert">The preview couldn't be loaded.</p>
		{:else}
			<VisibleHistoryList entries={visibleHistoryQuery.data.entries} />
		{/if}
	{:else}
		<p class="mt-2 text-sm text-slate-600">
			Self-reported. Entries are private until you make them visible, and only you see the
			visibility labels and notes.
		</p>
		{#if ownHistoryQuery.isError}
			<p class="mt-2 text-sm text-slate-600" role="status">
				Couldn't refresh your history. Showing what was loaded earlier.
			</p>
		{/if}
		{#if ownGroups.length === 0}
			<div class="mt-4 rounded-[20px] border bg-white p-4">
				<p class="font-semibold">No courses yet</p>
				<p class="mt-1 text-sm text-slate-600">
					Add the courses you're planning, taking, or took. Taking or Took lets you review a course
					later.
				</p>
			</div>
		{:else}
			{#each ownGroups as group (group.key)}
				<div class="mt-4 overflow-hidden rounded-[20px] border bg-white">
					<h3 class="border-b px-4 py-2 text-sm font-semibold tracking-wide uppercase">
						{group.heading}
					</h3>
					<ul class="divide-y">
						{#each group.entries as entry (entry.id)}
							<li>
								<button
									type="button"
									class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
									aria-label="Edit {entry.course.code} {entry.course.title}"
									onclick={() => openEditor(entry)}
								>
									<HistoryCourseLabel course={entry.course} />
									<span class="flex flex-col items-end gap-1">
										<HistoryStatusBadge status={entry.status} />
										<span class="text-sm text-slate-600">
											{entry.visibility === 'visible' ? 'Visible' : 'Private'}{entry.privateNote
												? ' · note'
												: ''}
										</span>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/if}
	{/if}
</section>

<HistoryEntryEditorDialog
	bind:open={isEditorOpen}
	{editedEntry}
	defaultInstitutionId={primaryInstitutionId}
/>
