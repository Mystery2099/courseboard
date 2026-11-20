<script lang="ts">
	import { toggleVariants } from '#lib/components/ui/toggle/index.js';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	export interface FilterChipOption {
		value: string;
		label: string;
		isSelected: boolean;
	}

	let {
		label,
		options,
		...selectAttributes
	}: { label: string; options: FilterChipOption[] } & Omit<HTMLSelectAttributes, 'class'> =
		$props();
</script>

<!-- A native select styled as a chip, so the filter works without JavaScript. -->
<label
	class="{toggleVariants({
		variant: 'chip'
	})} items-stretch gap-0 pr-2 outline-primary after:hidden focus-within:outline-2 focus-within:outline-offset-2"
>
	<span class="self-center whitespace-nowrap">{label}:</span>
	<!-- Taller than the chip it sits in, so the select itself is a 44px target. -->
	<select
		{...selectAttributes}
		class="-my-1.5 field-sizing-content min-h-11 max-w-48 appearance-none border-0 bg-transparent bg-none py-0 pr-6 pl-1 text-base font-semibold focus:ring-0 focus:outline-none desktop:text-sm"
	>
		{#each options as option (option.value)}
			<option value={option.value} selected={option.isSelected}>{option.label}</option>
		{/each}
	</select>
	<ChevronDown size={16} class="pointer-events-none -ml-5 self-center" aria-hidden="true" />
</label>
