<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { THREAD_KIND_LABELS } from '#lib/client/content/PostPresentation.ts';
	import type { PostKind } from '#lib/contracts/PostContract.ts';

	let { kind }: { kind: PostKind } = $props();
</script>

<Badge variant={kind === 'question' ? 'primary' : 'tertiary'}>{THREAD_KIND_LABELS[kind]()}</Badge>
