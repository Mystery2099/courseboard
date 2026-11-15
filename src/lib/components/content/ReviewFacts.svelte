<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import {
		formatTerm,
		HISTORY_STATUS_LABELS
	} from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { ReviewData } from '#lib/contracts/ReviewContract.ts';

	let { review }: { review: ReviewData } = $props();
</script>

<p class="mt-2 text-sm text-slate-600">
	{m.review_facts_summary({
		status: HISTORY_STATUS_LABELS[review.status](),
		term: formatTerm(review.term)
	})}
</p>
<dl class="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
	<div class="flex gap-2">
		<dt class="text-slate-600">{m.review_facts_workload()}</dt>
		<dd class="font-semibold">{m.review_facts_workload_value({ workload: review.workload })}</dd>
	</div>
	<div class="flex gap-2">
		<dt class="text-slate-600">{m.reviews_statistic_take_again()}</dt>
		<dd class="font-semibold">{review.wouldTakeAgain ? m.common_yes() : m.common_no()}</dd>
	</div>
</dl>
