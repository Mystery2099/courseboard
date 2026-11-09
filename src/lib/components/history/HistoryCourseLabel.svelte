<script lang="ts">
	import type { HistoryCourseResponse } from '#lib/contracts/AcademicHistoryContract.ts';

	let { course }: { course: HistoryCourseResponse } = $props();
</script>

<span class="min-w-0 flex-1">
	<span class="block font-mono text-sm font-semibold text-blue-700">{course.code}</span>
	<span class="block truncate font-semibold">{course.title}</span>
</span>
