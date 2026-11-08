<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { untrack } from 'svelte';
	import { z } from 'zod';
	import { ApiRequestError } from '#lib/client/ApiRequest.ts';
	import {
		AcademicHistoryApiClient,
		academicHistoryQueryKeys
	} from '#lib/client/history/AcademicHistoryApiClient.ts';
	import {
		HISTORY_STATUS_LABELS,
		TERM_SEASON_LABELS,
		currentTerm
	} from '#lib/client/history/AcademicHistoryPresentation.ts';
	import {
		HISTORY_STATUSES,
		PRIVATE_NOTE_MAX_LENGTH,
		TERM_SEASONS,
		updateHistoryEntrySchema,
		type HistoryCourseResponse,
		type HistoryStatus,
		type HistoryVisibility,
		type OwnHistoryEntryResponse,
		type TermSeason,
		type UpdateHistoryEntryRequest
	} from '#lib/contracts/AcademicHistoryContract.ts';
	import CoursePicker from './CoursePicker.svelte';

	let {
		editedEntry,
		presetCourse,
		defaultInstitutionId,
		onDone
	}: {
		/** Null when recording a new entry. */
		editedEntry: OwnHistoryEntryResponse | null;
		presetCourse: HistoryCourseResponse | null;
		defaultInstitutionId: string | null;
		onDone: (outcome: 'saved' | 'deleted' | 'cancelled') => void;
	} = $props();

	const queryClient = useQueryClient();
	const initial = untrack(() => {
		const term = editedEntry ? editedEntry.term : currentTerm();
		return {
			course: editedEntry?.course ?? presetCourse,
			status: editedEntry?.status ?? 'taking',
			season: term?.season ?? '',
			year: term?.year ?? currentTerm().year,
			visibility: editedEntry?.visibility ?? 'private',
			privateNote: editedEntry?.privateNote ?? ''
		};
	});

	let course = $state<HistoryCourseResponse | null>(initial.course);
	let isChoosingCourse = $state(initial.course === null);
	let status = $state<HistoryStatus>(initial.status);
	let season = $state<TermSeason | ''>(initial.season);
	let year = $state(initial.year);
	let visibility = $state<HistoryVisibility>(initial.visibility);
	let privateNote = $state(initial.privateNote);
	let fieldErrors = $state<Record<string, string | undefined>>({});
	let isConfirmingDelete = $state(false);

	const yearOptions = $derived.by(() => {
		const latestYear = new Date().getFullYear() + 2;
		const years = Array.from({ length: 32 }, (_, offset) => latestYear - offset);
		return years.includes(year) ? years : [...years, year];
	});

	const saveMutation = createMutation(() => ({
		mutationFn: (request: UpdateHistoryEntryRequest) =>
			editedEntry
				? AcademicHistoryApiClient.updateEntry(editedEntry.id, request)
				: AcademicHistoryApiClient.createEntry({ ...request, courseId: course!.id }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: academicHistoryQueryKeys.all });
			onDone('saved');
		}
	}));

	const deleteMutation = createMutation(() => ({
		mutationFn: (entryId: string) => AcademicHistoryApiClient.deleteEntry(entryId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: academicHistoryQueryKeys.all });
			onDone('deleted');
		}
	}));

	const requestError = $derived(saveMutation.error ?? deleteMutation.error);
	const isBusy = $derived(saveMutation.isPending || deleteMutation.isPending);

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!course) {
			fieldErrors = { course: 'Choose a course.' };
			return;
		}
		const parsed = updateHistoryEntrySchema.safeParse({
			status,
			term: season ? { season, year } : null,
			visibility,
			privateNote
		});
		if (!parsed.success) {
			const errors = z.flattenError(parsed.error).fieldErrors;
			fieldErrors = { term: errors.term?.[0], privateNote: errors.privateNote?.[0] };
			return;
		}
		fieldErrors = {};
		saveMutation.mutate(parsed.data);
	}
</script>

<form class="flex flex-col gap-5" onsubmit={save} novalidate>
	<div class="flex flex-col gap-1">
		<span class="text-sm font-semibold" id="history-course-label">Course</span>
		{#if isChoosingCourse && !editedEntry}
			<CoursePicker
				{defaultInstitutionId}
				onSelect={(selected) => {
					course = selected;
					isChoosingCourse = false;
					fieldErrors = { ...fieldErrors, course: undefined };
				}}
			/>
		{:else if course}
			<div
				class="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
				aria-labelledby="history-course-label"
			>
				<div class="min-w-0">
					<p class="font-mono text-sm text-blue-700">{course.code} · {course.institution.name}</p>
					<p class="truncate font-semibold">{course.title}</p>
				</div>
				{#if !editedEntry && !presetCourse}
					<button
						type="button"
						class="shrink-0 font-semibold text-blue-700"
						onclick={() => (isChoosingCourse = true)}>Change</button
					>
				{/if}
			</div>
		{/if}
		{#if fieldErrors.course}
			<p class="text-sm text-red-700" role="alert">{fieldErrors.course}</p>
		{/if}
	</div>

	<fieldset>
		<legend class="text-sm font-semibold">Status</legend>
		<div class="mt-1 grid grid-cols-3 overflow-hidden rounded-full border">
			{#each HISTORY_STATUSES as option (option)}
				<label
					class="cursor-pointer border-l py-2 text-center first:border-l-0 has-checked:bg-indigo-100 has-checked:font-semibold has-focus-visible:outline-2"
				>
					<input type="radio" class="sr-only" value={option} bind:group={status} />
					{HISTORY_STATUS_LABELS[option]}
				</label>
			{/each}
		</div>
	</fieldset>

	<fieldset>
		<legend class="text-sm font-semibold">Term</legend>
		<div class="mt-1 flex gap-2">
			<label class="flex-1">
				<span class="sr-only">Season</span>
				<select
					class="w-full rounded-2xl border-slate-300 px-4 py-2"
					bind:value={season}
					aria-invalid={fieldErrors.term ? 'true' : undefined}
				>
					{#if status === 'planning' || season === ''}
						<option value="">No term yet</option>
					{/if}
					{#each TERM_SEASONS as option (option)}
						<option value={option}>{TERM_SEASON_LABELS[option]}</option>
					{/each}
				</select>
			</label>
			<label class="flex-1">
				<span class="sr-only">Year</span>
				<select
					class="w-full rounded-2xl border-slate-300 px-4 py-2 disabled:opacity-50"
					bind:value={year}
					disabled={season === ''}
				>
					{#each yearOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</label>
		</div>
		{#if fieldErrors.term}
			<p class="mt-1 text-sm text-red-700" role="alert">{fieldErrors.term}</p>
		{/if}
	</fieldset>

	<fieldset>
		<legend class="text-sm font-semibold">Who can see this entry</legend>
		<div class="mt-1 grid grid-cols-2 gap-2">
			<label
				class="cursor-pointer rounded-2xl border py-2 text-center has-checked:border-blue-700 has-checked:bg-indigo-100 has-checked:font-semibold has-focus-visible:outline-2"
			>
				<input type="radio" class="sr-only" value="private" bind:group={visibility} />
				Private
			</label>
			<label
				class="cursor-pointer rounded-2xl border py-2 text-center has-checked:border-blue-700 has-checked:bg-indigo-100 has-checked:font-semibold has-focus-visible:outline-2"
			>
				<input type="radio" class="sr-only" value="visible" bind:group={visibility} />
				Visible on profile
			</label>
		</div>
		<p class="mt-1 text-sm text-slate-600">
			{visibility === 'private'
				? 'Only you see this entry.'
				: 'Other students see the course, status, and term on your profile.'}
		</p>
	</fieldset>

	<label class="flex flex-col gap-1">
		<span class="text-sm"
			><span class="font-semibold">Private note</span> · optional · only you ever see this</span
		>
		<textarea
			class="min-h-20 rounded-2xl border-slate-300 px-4 py-2"
			bind:value={privateNote}
			maxlength={PRIVATE_NOTE_MAX_LENGTH}
			aria-invalid={fieldErrors.privateNote ? 'true' : undefined}
		></textarea>
		{#if fieldErrors.privateNote}
			<p class="text-sm text-red-700" role="alert">{fieldErrors.privateNote}</p>
		{/if}
	</label>

	{#if requestError}
		<p class="text-sm text-red-700" role="alert">
			{requestError instanceof ApiRequestError
				? requestError.message
				: 'Your changes could not be saved. Try again.'}
		</p>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<button
			type="submit"
			class="rounded-full bg-blue-700 px-5 py-2 font-semibold text-white disabled:opacity-50"
			disabled={isBusy}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button
		>
		<button type="button" class="rounded-full border px-5 py-2" onclick={() => onDone('cancelled')}
			>Cancel</button
		>
		{#if editedEntry}
			<span class="flex-1"></span>
			{#if isConfirmingDelete}
				<span class="text-sm">Delete this entry?</span>
				<button
					type="button"
					class="rounded-full bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
					disabled={isBusy}
					onclick={() => deleteMutation.mutate(editedEntry.id)}>Delete</button
				>
				<button
					type="button"
					class="rounded-full border px-4 py-2"
					onclick={() => (isConfirmingDelete = false)}>Keep</button
				>
			{:else}
				<button
					type="button"
					class="rounded-full px-4 py-2 text-red-700"
					onclick={() => (isConfirmingDelete = true)}>Delete entry</button
				>
			{/if}
		{/if}
	</div>
</form>
