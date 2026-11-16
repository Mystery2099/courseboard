<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
	import { cn, type WithoutChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = 'default',
		...restProps
	}: WithoutChild<SelectPrimitive.TriggerProps> & {
		size?: 'default' | 'chip';
	} = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	data-slot="select-trigger"
	data-size={size}
	class={cn(
		"flex w-fit items-center justify-between gap-2 border border-outline bg-surface whitespace-nowrap text-on-surface transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-2 aria-invalid:border-error data-placeholder:text-on-surface-variant data-[size=chip]:relative data-[size=chip]:min-h-9 data-[size=chip]:rounded-chip data-[size=chip]:bg-transparent data-[size=chip]:px-4 data-[size=chip]:text-sm data-[size=chip]:after:absolute data-[size=chip]:after:inset-x-0 data-[size=chip]:after:-inset-y-1.5 data-[size=chip]:hover:bg-on-surface/8 data-[size=default]:min-h-12 data-[size=default]:rounded-field data-[size=default]:px-4 data-[size=default]:text-base *:data-[slot=select-value]:line-clamp-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDownIcon class="pointer-events-none size-4 text-on-surface-variant" />
</SelectPrimitive.Trigger>
