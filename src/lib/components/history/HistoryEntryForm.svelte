<script lang="ts">
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { tick, untrack } from 'svelte';
	import { describeFieldIssues, describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import { reviewQueryKeys } from '#lib/client/content/ReviewApiClient.ts';
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
		formId,
		isBusy = $bindable(false),
		onDone
	}: {
		/** Null when recording a new entry. */
		editedEntry: OwnHistoryEntryResponse | null;
		presetCourse: HistoryCourseResponse | null;
		defaultInstitutionId: string | null;
		/** Lets a submit button outside the form, such as a dialog header's, submit it. */
		formId?: string;
		/** True while saving or deleting, for buttons outside the form. */
		isBusy?: boolean;
		onDone: (outcome: 'saved' | 'deleted' | 'cancelled') => void;
	} = $props();

	const queryClient = useQueryClient();
	const initial = untrack(() => {
		const term = editedEntry ? editedEntry.term : currentTerm();
		const season: TermSeason | '' = term?.season ?? '';
		return {
			course: editedEntry?.course ?? presetCourse,
			status: editedEntry?.status ?? 'taking',
			season,
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
	let keepEntryButton = $state<HTMLButtonElement | null>(null);

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
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: academicHistoryQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all })
			]);
			onDone('saved');
		}
	}));

	const deleteMutation = createMutation(() => ({
		mutationFn: (entryId: string) => AcademicHistoryApiClient.deleteEntry(entryId),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: academicHistoryQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all })
			]);
			onDone('deleted');
		}
	}));

	const requestError = $derived(saveMutation.error ?? deleteMutation.error);
	$effect(() => {
		isBusy = saveMutation.isPending || deleteMutation.isPending;
	});

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!course) {
			fieldErrors = { course: m.history_form_course_required() };
			const form = event.currentTarget as HTMLFormElement;
			void tick().then(() => form.querySelector<HTMLElement>('[data-course-list] button')?.focus());
			return;
		}
		const parsed = updateHistoryEntrySchema.safeParse({
			status,
			term: season ? { season, year } : null,
			visibility,
			privateNote
		});
		if (!parsed.success) {
			fieldErrors = describeFieldIssues(parsed.error);
			const form = event.currentTarget as HTMLFormElement;
			void tick().then(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
			return;
		}
		fieldErrors = {};
		saveMutation.mutate(parsed.data);
	}
</script>

<form id={formId} class="flex flex-col gap-5" onsubmit={save} novalidate>
	<div class="flex flex-col gap-1">
		<span class="text-sm font-semibold" id="history-course-label">{m.history_form_course()}</span>
		{#if isChoosingCourse && !editedEntry}
			<CoursePicker
				{defaultInstitutionId}
				errorId={fieldErrors.course ? 'history-course-error' : undefined}
				onSelect={(selected) => {
					course = selected;
					isChoosingCourse = false;
					fieldErrors = { ...fieldErrors, course: undefined };
				}}
			/>
		{:else if course}
			<div
				class="flex items-center justify-between gap-3 rounded-field border border-outline px-4 py-3"
				aria-labelledby="history-course-label"
			>
				<div class="min-w-0">
					<p class="font-mono text-sm font-semibold text-primary">
						{course.code} · {course.institution.name}
					</p>
					<p class="truncate font-semibold">{course.title}</p>
				</div>
				{#if !editedEntry && !presetCourse}
					<Button
						variant="text"
						size="compact"
						class="shrink-0"
						onclick={() => (isChoosingCourse = true)}>{m.common_change()}</Button
					>
				{/if}
			</div>
		{/if}
		{#if fieldErrors.course}
			<p id="history-course-error" class="text-sm text-error" role="alert">
				{fieldErrors.course}
			</p>
		{/if}
	</div>

	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold" id="history-status-label">{m.history_form_status()}</span>
		<ToggleGroup.Root
			type="single"
			variant="segment"
			aria-labelledby="history-status-label"
			bind:value={() => status, (option) => option && (status = option as HistoryStatus)}
		>
			{#each HISTORY_STATUSES as option (option)}
				<ToggleGroup.Item value={option}>{HISTORY_STATUS_LABELS[option]()}</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</div>

	<fieldset>
		<legend class="text-sm font-semibold">{m.history_form_term()}</legend>
		<div class="mt-1.5 flex gap-2">
			<label class="flex-1">
				<span class="sr-only">{m.history_form_season()}</span>
				<select
					class="min-h-12 w-full rounded-field px-4 text-base"
					bind:value={season}
					aria-invalid={fieldErrors.term ? 'true' : undefined}
					aria-describedby={fieldErrors.term ? 'history-term-error' : undefined}
				>
					{#if status === 'planning' || season === ''}
						<option value="">{m.history_form_no_term()}</option>
					{/if}
					{#each TERM_SEASONS as option (option)}
						<option value={option}>{TERM_SEASON_LABELS[option]()}</option>
					{/each}
				</select>
			</label>
			<label class="flex-1">
				<span class="sr-only">{m.history_form_year()}</span>
				<select
					class="min-h-12 w-full rounded-field px-4 text-base disabled:opacity-50"
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
			<p id="history-term-error" class="mt-1 text-sm text-error" role="alert">{fieldErrors.term}</p>
		{/if}
	</fieldset>

	<fieldset>
		<legend class="text-sm font-semibold">{m.history_form_visibility()}</legend>
		<div class="mt-1.5 grid grid-cols-2 gap-2">
			<label
				class="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-outline state-layer px-3 text-center font-semibold outline-primary transition-colors duration-150 has-checked:border-primary has-checked:bg-secondary-container has-checked:text-on-secondary-container has-checked:[--state-base:var(--secondary-container)] has-checked:[--state-color:var(--on-secondary-container)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
			>
				<input type="radio" class="sr-only" value="private" bind:group={visibility} />
				{m.history_visibility_private()}
			</label>
			<label
				class="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-outline state-layer px-3 text-center font-semibold outline-primary transition-colors duration-150 has-checked:border-primary has-checked:bg-secondary-container has-checked:text-on-secondary-container has-checked:[--state-base:var(--secondary-container)] has-checked:[--state-color:var(--on-secondary-container)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
			>
				<input type="radio" class="sr-only" value="visible" bind:group={visibility} />
				{m.history_form_visible_on_profile()}
			</label>
		</div>
		<p class="mt-1 text-sm text-on-surface-variant">
			{visibility === 'private'
				? m.history_form_private_explanation()
				: m.history_form_visible_explanation()}
		</p>
	</fieldset>

	<label class="flex flex-col gap-1">
		<span class="text-sm"
			><span class="font-semibold">{m.history_form_private_note()}</span
			>{m.history_form_private_note_hint()}</span
		>
		<textarea
			class="min-h-24 rounded-field px-4 py-3 text-base"
			bind:value={privateNote}
			maxlength={PRIVATE_NOTE_MAX_LENGTH}
			aria-invalid={fieldErrors.privateNote ? 'true' : undefined}
			aria-describedby={fieldErrors.privateNote ? 'history-note-error' : undefined}></textarea>
		{#if fieldErrors.privateNote}
			<p id="history-note-error" class="text-sm text-error" role="alert">
				{fieldErrors.privateNote}
			</p>
		{/if}
	</label>

	{#if requestError}
		<p class="text-sm text-error" role="alert">
			{describeRequestFailure(requestError, m.history_form_save_failed)}
		</p>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<!-- On phones the dialog header carries Save, and its close button cancels. -->
		<Button variant="filled" type="submit" class="max-tablet:hidden" disabled={isBusy}
			>{saveMutation.isPending ? m.common_saving() : m.common_save()}</Button
		>
		<Button variant="outlined" class="max-tablet:hidden" onclick={() => onDone('cancelled')}
			>{m.common_cancel()}</Button
		>
		{#if editedEntry}
			<span class="flex-1"></span>
			<AlertDialog.Root bind:open={isConfirmingDelete}>
				<AlertDialog.Trigger type="button" class={buttonVariants({ variant: 'destructive-text' })}
					>{m.history_form_delete_entry()}</AlertDialog.Trigger
				>
				<AlertDialog.Content
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						keepEntryButton?.focus();
					}}
				>
					<AlertDialog.Header>
						<AlertDialog.Title>{m.history_form_delete_confirm()}</AlertDialog.Title>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<!-- Cancel takes focus when the dialog opens, so Enter never deletes by accident. -->
						<AlertDialog.Cancel bind:ref={keepEntryButton}
							>{m.history_form_keep()}</AlertDialog.Cancel
						>
						<AlertDialog.Action
							variant="destructive"
							disabled={isBusy}
							onclick={() => deleteMutation.mutate(editedEntry.id)}
							>{m.common_delete()}</AlertDialog.Action
						>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		{/if}
	</div>
</form>
