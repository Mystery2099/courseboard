<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props();
</script>

<!-- Blueprint switch: 52 × 32. The thumb grows when on, and on/off differ by shape as well as color. -->
<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	class={cn(
		'group/switch relative inline-flex h-8 w-13 shrink-0 items-center rounded-full border-2 transition-colors duration-150 after:absolute after:-inset-1.5 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-outline data-[state=unchecked]:bg-surface-container',
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		data-slot="switch-thumb"
		class="pointer-events-none block rounded-full transition-all duration-150 data-[state=checked]:size-6 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-on-primary data-[state=unchecked]:size-4 data-[state=unchecked]:translate-x-1.5 data-[state=unchecked]:bg-on-surface-variant"
	/>
</SwitchPrimitive.Root>
