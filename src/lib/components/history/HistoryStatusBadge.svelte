<script lang="ts">
	import { HISTORY_STATUS_LABELS } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { HistoryStatus } from '#lib/contracts/AcademicHistoryContract.ts';

	let { status }: { status: HistoryStatus } = $props();
</script>

<span
	class={[
		'rounded-full px-3 py-0.5 text-sm font-semibold',
		status === 'took' && 'bg-emerald-100 text-emerald-900',
		status === 'taking' && 'bg-sky-100 text-sky-900',
		status === 'planning' && 'bg-slate-100 text-slate-800'
	]}>{HISTORY_STATUS_LABELS[status]}</span
>
