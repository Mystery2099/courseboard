<script lang="ts">
	import { statusChipClass } from '#lib/components/ui/ControlStyles.ts';
	import { THREAD_KIND_LABELS } from '#lib/client/content/PostPresentation.ts';
	import type { PostKind } from '#lib/contracts/PostContract.ts';

	let { kind }: { kind: PostKind } = $props();
</script>

<span class={statusChipClass(kind === 'question' ? 'primary' : 'tertiary')}
	>{THREAD_KIND_LABELS[kind]()}</span
>
