<script lang="ts">
	import { HISTORY_STATUS_LABELS } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { HistoryStatus } from '#lib/contracts/AcademicHistoryContract.ts';

	let { status }: { status: HistoryStatus } = $props();
</script>

<span
	class={[
		'rounded-full px-3 py-0.5 text-sm font-semibold',
		status === 'took' && 'bg-success-container text-on-success-container',
		status === 'taking' && 'bg-primary-container text-on-primary-container',
		status === 'planning' && 'bg-surface-container text-on-surface'
	]}>{HISTORY_STATUS_LABELS[status]()}</span
>
