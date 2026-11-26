<script lang="ts">
	let {
		code,
		isCurrent = false,
		tone = 'surface'
	}: { code: string; isCurrent?: boolean; tone?: 'surface' | 'rail' } = $props();

	// "MATH 151" reads better stacked as "MATH" over "151" inside a narrow tile.
	const [subject, ...rest] = $derived(code.split(/\s+/));
</script>

<span
	class={[
		'flex size-12 shrink-0 flex-col items-center justify-center rounded-tile font-mono text-[11px] leading-tight font-semibold transition-colors duration-150',
		tone === 'surface' &&
			'bg-primary-container text-on-primary-container group-hover/tile:bg-[color-mix(in_oklab,var(--primary-container),var(--on-primary-container)_var(--state-hover-tinted))] group-active/tile:bg-[color-mix(in_oklab,var(--primary-container),var(--on-primary-container)_var(--state-pressed-tinted))]',
		tone === 'surface' && isCurrent && 'ring-3 ring-primary',
		tone === 'rail' &&
			!isCurrent &&
			'bg-[color-mix(in_oklab,var(--rail),var(--on-rail)_14%)] text-on-rail group-hover/tile:bg-[color-mix(in_oklab,var(--rail),var(--on-rail)_24%)]',
		tone === 'rail' && isCurrent && 'bg-gold text-on-gold'
	]}
	aria-hidden="true"
>
	<span>{subject}</span>
	{#if rest.length > 0}<span>{rest.join(' ')}</span>{/if}
</span>
