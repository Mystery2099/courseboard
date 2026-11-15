<script lang="ts">
	import { THREAD_KIND_LABELS } from '#lib/client/content/PostPresentation.ts';
	import type { PostKind } from '#lib/contracts/PostContract.ts';

	let { kind }: { kind: PostKind } = $props();
</script>

<span
	class={[
		'rounded-full px-3 py-0.5 text-sm font-semibold',
		kind === 'question'
			? 'bg-primary-container text-on-primary-container'
			: 'bg-tertiary-container text-on-tertiary-container'
	]}>{THREAD_KIND_LABELS[kind]()}</span
>
