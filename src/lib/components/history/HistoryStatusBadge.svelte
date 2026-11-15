<script lang="ts">
	import { statusChipClass, type StatusTone } from '#lib/components/ui/ControlStyles.ts';
	import { HISTORY_STATUS_LABELS } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { HistoryStatus } from '#lib/contracts/AcademicHistoryContract.ts';

	let { status }: { status: HistoryStatus } = $props();

	const STATUS_TONES: Record<HistoryStatus, StatusTone> = {
		took: 'success',
		taking: 'primary',
		planning: 'neutral'
	};
</script>

<span class={statusChipClass(STATUS_TONES[status])}>{HISTORY_STATUS_LABELS[status]()}</span>
