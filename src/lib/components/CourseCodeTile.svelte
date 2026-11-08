<script lang="ts">
	let { code, isCurrent = false }: { code: string; isCurrent?: boolean } = $props();

	// "MATH 151" reads better stacked as "MATH" over "151" inside a narrow tile.
	const [subject, ...rest] = $derived(code.split(/\s+/));
</script>

<span
	class={[
		'flex size-12 shrink-0 flex-col items-center justify-center rounded-[15px] bg-sky-100 font-mono text-[11px] leading-tight font-semibold text-slate-900',
		isCurrent && 'ring-3 ring-blue-700'
	]}
	aria-hidden="true"
>
	<span>{subject}</span>
	{#if rest.length > 0}<span>{rest.join(' ')}</span>{/if}
</span>
