<script lang="ts">
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.js';
	import { HISTORY_STATUS_LABELS } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { HistoryStatus } from '#lib/contracts/AcademicHistoryContract.ts';

	let { status }: { status: HistoryStatus } = $props();

	const STATUS_TONES: Record<HistoryStatus, BadgeVariant> = {
		took: 'success',
		taking: 'primary',
		planning: 'neutral'
	};
</script>

<Badge variant={STATUS_TONES[status]}>{HISTORY_STATUS_LABELS[status]()}</Badge>
