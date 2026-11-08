<script lang="ts">
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
		<Dialog.Overlay class="fixed inset-0 z-40 bg-slate-900/40" />
		<Dialog.Content
			class="fixed inset-0 z-50 overflow-y-auto bg-white p-4 tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-[90dvh] tablet:w-[34rem] tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-[24px] tablet:p-6 tablet:shadow-xl"
		>
			<div class="mb-4 flex items-center gap-3">
				<Dialog.Close class="-ml-2 rounded-full p-2" aria-label="Close"><X size={22} /></Dialog.Close
				>
				<Dialog.Title class="text-xl font-semibold">
					{editedEntry ? 'Edit history entry' : 'Add to my history'}
				</Dialog.Title>
			</div>
			<Dialog.Description class="sr-only">
				Record a course you're planning, taking, or took. Entries are private unless you make them
				visible on your profile.
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
