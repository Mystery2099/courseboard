<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import Ellipsis from 'lucide-svelte/icons/ellipsis';
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

<section aria-labelledby="history-heading">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 id="history-heading" class="text-xl font-semibold">{m.history_heading()}</h2>
		<div class="flex flex-wrap gap-2">
			<Button
				variant={isPreviewingAsOthers ? 'tonal' : 'outlined'}
				size="compact"
				aria-pressed={isPreviewingAsOthers}
				onclick={() => (isPreviewingAsOthers = !isPreviewingAsOthers)}
				>{m.history_preview_as_others()}</Button
			>
			{#if !isPreviewingAsOthers}
				<Button variant="filled" size="compact" onclick={() => openEditor(null)}
					><Plus size={18} /> {m.history_add_course()}</Button
				>
			{/if}
		</div>
	</div>

	{#if isPreviewingAsOthers}
		<p class="mt-2 text-sm text-on-surface-variant">
			{m.history_preview_explanation()}
			<a class="font-semibold text-primary" href={resolve('/(app)/users/[username]', { username })}
				>{m.history_open_profile_page()}</a
			>
		</p>
		{#if visibleHistoryQuery.isPending}
			<p class="mt-4 text-sm text-on-surface-variant">{m.history_preview_loading()}</p>
		{:else if visibleHistoryQuery.isError}
			<p class="mt-4 text-sm text-error" role="alert">{m.history_preview_failed()}</p>
		{:else}
			<VisibleHistoryList entries={visibleHistoryQuery.data.entries} />
		{/if}
	{:else}
		<p class="mt-2 text-sm text-on-surface-variant">
			{m.history_explanation()}
		</p>
		{#if ownHistoryQuery.isError}
			<p class="mt-2 text-sm text-on-surface-variant" role="status">
				{m.history_refresh_failed()}
			</p>
		{/if}
		{#if ownGroups.length === 0}
			<div class="mt-4 rounded-card border bg-surface p-4">
				<p class="font-semibold">{m.history_empty_title()}</p>
				<p class="mt-1 text-sm text-on-surface-variant">
					{m.history_empty_detail()}
				</p>
			</div>
		{:else}
			{#each ownGroups as group (group.key)}
				<div class="mt-4 overflow-hidden rounded-card border bg-surface">
					<h3 class="border-b px-4 py-3 text-overline text-on-surface-variant">
						{group.heading}
					</h3>
					<ul class="divide-y">
						{#each group.entries as entry (entry.id)}
							<li>
								<button
									type="button"
									class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-container"
									aria-label={m.history_edit_entry_label({
										courseCode: entry.course.code,
										courseTitle: entry.course.title
									})}
									onclick={() => openEditor(entry)}
								>
									<HistoryCourseLabel course={entry.course} />
									<span
										class="flex flex-col items-end gap-1 desktop:w-64 desktop:flex-row desktop:items-center desktop:gap-4"
									>
										<HistoryStatusBadge status={entry.status} />
										<span class="text-sm text-on-surface-variant desktop:flex-1">
											{entry.visibility === 'visible'
												? m.history_visibility_visible()
												: m.history_visibility_private()}{entry.privateNote
												? m.history_note_suffix()
												: ''}
										</span>
									</span>
									<Ellipsis
										size={20}
										class="hidden shrink-0 text-on-surface-variant desktop:block"
									/>
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
