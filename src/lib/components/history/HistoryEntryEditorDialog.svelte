<script lang="ts">
	import EditorDialog from '#lib/components/EditorDialog.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type {
		HistoryCourseResponse,
		OwnHistoryEntryResponse
	} from '#lib/contracts/AcademicHistoryContract.ts';
	import HistoryEntryForm from './HistoryEntryForm.svelte';

	let {
		open = $bindable(false),
		editedEntry = null,
		presetCourse = null,
		defaultInstitutionId = null,
		onSaved
	}: {
		open?: boolean;
		editedEntry?: OwnHistoryEntryResponse | null;
		presetCourse?: HistoryCourseResponse | null;
		defaultInstitutionId?: string | null;
		onSaved?: () => void;
	} = $props();

	const formId = $props.id();
	let isSaving = $state(false);
</script>

<EditorDialog
	bind:open
	title={editedEntry ? m.history_editor_edit_title() : m.common_add_to_history()}
	description={m.history_editor_description()}
	{formId}
	submitLabel={isSaving ? m.common_saving() : m.common_save()}
	isSubmitting={isSaving}
>
	<HistoryEntryForm
		{editedEntry}
		{presetCourse}
		{defaultInstitutionId}
		{formId}
		bind:isBusy={isSaving}
		onDone={(outcome) => {
			open = false;
			if (outcome === 'saved') onSaved?.();
		}}
	/>
</EditorDialog>
