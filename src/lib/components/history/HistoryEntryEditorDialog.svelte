<script lang="ts">
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { Dialog } from 'bits-ui';
	import X from 'lucide-svelte/icons/x';
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
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-scrim" />
		<Dialog.Content
			class="fixed inset-0 z-50 overflow-y-auto bg-surface p-4 tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-[90dvh] tablet:w-[34rem] tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-sheet tablet:p-6 tablet:shadow-dialog"
		>
			<div class="mb-4 flex items-center gap-3">
				<Dialog.Close
					class={[buttonVariants({ variant: 'ghost', size: 'icon' }), '-ml-2']}
					aria-label={m.common_close()}><X size={22} /></Dialog.Close
				>
				<Dialog.Title class="text-xl font-bold">
					{editedEntry ? m.history_editor_edit_title() : m.common_add_to_history()}
				</Dialog.Title>
			</div>
			<Dialog.Description class="sr-only">
				{m.history_editor_description()}
			</Dialog.Description>
			<HistoryEntryForm
				{editedEntry}
				{presetCourse}
				{defaultInstitutionId}
				onDone={(outcome) => {
					open = false;
					if (outcome === 'saved') onSaved?.();
				}}
			/>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
