<script lang="ts">
	import {
		formatTerm,
		HISTORY_STATUS_LABELS
	} from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { ReviewData } from '#lib/contracts/ReviewContract.ts';

	let { review }: { review: ReviewData } = $props();
</script>

<p class="mt-2 text-sm text-slate-600">
	{HISTORY_STATUS_LABELS[review.status]} · {formatTerm(review.term)} · self-reported
</p>
<dl class="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
	<div class="flex gap-2">
		<dt class="text-slate-600">Workload</dt>
		<dd class="font-semibold">{review.workload} / 5</dd>
	</div>
	<div class="flex gap-2">
		<dt class="text-slate-600">Would take again</dt>
		<dd class="font-semibold">{review.wouldTakeAgain ? 'Yes' : 'No'}</dd>
	</div>
</dl>
