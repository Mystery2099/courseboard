<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<!-- Underline tabs: the active one gets a 3px primary indicator and bold text. -->
<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		'relative -mb-px inline-flex min-h-12 items-center justify-center px-4 font-semibold text-on-surface-variant transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-primary after:opacity-0 hover:text-on-surface disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-on-surface data-[state=active]:after:opacity-100',
		className
	)}
	{...restProps}
/>
