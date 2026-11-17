<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import { type ToggleVariant, toggleVariants } from '#lib/components/ui/toggle/index.js';
	import { cn } from '#lib/utils.js';
	import { getToggleGroupCtx } from './toggle-group.svelte';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		variant,
		...restProps
	}: ToggleGroupPrimitive.ItemProps & { variant?: ToggleVariant } = $props();

	const ctx = getToggleGroupCtx();
</script>

<ToggleGroupPrimitive.Item
	bind:ref
	data-slot="toggle-group-item"
	class={cn(toggleVariants({ variant: ctx.variant ?? variant }), className)}
	{value}
	{...restProps}
/>
