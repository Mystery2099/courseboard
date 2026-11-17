<script lang="ts">
	let { code, isCurrent = false }: { code: string; isCurrent?: boolean } = $props();

	// "MATH 151" reads better stacked as "MATH" over "151" inside a narrow tile.
	const [subject, ...rest] = $derived(code.split(/\s+/));
</script>

<span
	class={[
		'flex size-12 shrink-0 flex-col items-center justify-center rounded-tile bg-primary-container font-mono text-[11px] leading-tight font-semibold text-on-primary-container transition-colors duration-150 group-hover/tile:bg-[color-mix(in_oklab,var(--primary-container),var(--on-primary-container)_var(--state-hover-tinted))] group-active/tile:bg-[color-mix(in_oklab,var(--primary-container),var(--on-primary-container)_var(--state-pressed-tinted))]',
		isCurrent && 'ring-3 ring-primary'
	]}
	aria-hidden="true"
>
	<span>{subject}</span>
	{#if rest.length > 0}<span>{rest.join(' ')}</span>{/if}
</span>
