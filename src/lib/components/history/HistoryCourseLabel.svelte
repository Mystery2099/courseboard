<script lang="ts">
	import type { HistoryCourseResponse } from '#lib/contracts/AcademicHistoryContract.ts';

	let { course }: { course: HistoryCourseResponse } = $props();
</script>

<!-- Stacked on phones; on desktop the code gets its own column, as in the history designs. -->
<span class="flex min-w-0 flex-1 flex-col desktop:flex-row desktop:items-center desktop:gap-6">
	<span class="font-mono text-sm font-semibold text-primary desktop:w-28 desktop:shrink-0"
		>{course.code}</span
	>
	<span class="min-w-0 font-semibold wrap-break-word">{course.title}</span>
</span>
