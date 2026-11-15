<script lang="ts">
	import { buttonClass } from '#lib/components/ui/ControlStyles.ts';
	import { m } from '#lib/paraglide/messages.js';
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
		<h2 id="history-heading" class="text-xl font-semibold">{m.history_heading()}</h2>
		<div class="flex gap-2">
			<button
				type="button"
				class={buttonClass(isPreviewingAsOthers ? 'tonal' : 'outlined', 'compact')}
				aria-pressed={isPreviewingAsOthers}
				onclick={() => (isPreviewingAsOthers = !isPreviewingAsOthers)}
				>{m.history_preview_as_others()}</button
			>
			{#if !isPreviewingAsOthers}
				<button
					type="button"
					class={buttonClass('filled', 'compact')}
					onclick={() => openEditor(null)}><Plus size={18} /> {m.history_add_course()}</button
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
					<h3 class="border-b px-4 py-2 text-sm font-semibold tracking-wide uppercase">
						{group.heading}
					</h3>
					<ul class="divide-y">
						{#each group.entries as entry (entry.id)}
							<li>
								<button
									type="button"
									class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-container"
									aria-label={m.history_edit_entry_label({
										courseCode: entry.course.code,
										courseTitle: entry.course.title
									})}
									onclick={() => openEditor(entry)}
								>
									<HistoryCourseLabel course={entry.course} />
									<span class="flex flex-col items-end gap-1">
										<HistoryStatusBadge status={entry.status} />
										<span class="text-sm text-on-surface-variant">
											{entry.visibility === 'visible'
												? m.history_visibility_visible()
												: m.history_visibility_private()}{entry.privateNote
												? m.history_note_suffix()
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
