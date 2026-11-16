<script lang="ts" module>
	import { getContext, setContext } from 'svelte';
	import type { ToggleVariant } from '#lib/components/ui/toggle/index.js';

	interface ToggleGroupContext {
		variant: ToggleVariant;
	}

	export function setToggleGroupCtx(props: ToggleGroupContext) {
		setContext('toggleGroup', props);
	}

	export function getToggleGroupCtx() {
		return getContext<ToggleGroupContext>('toggleGroup');
	}
</script>

<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		variant = 'chip',
		...restProps
	}: ToggleGroupPrimitive.RootProps & { variant?: ToggleVariant } = $props();

	setToggleGroupCtx({
		get variant() {
			return variant;
		}
	});
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<ToggleGroupPrimitive.Root
	bind:value={value as never}
	bind:ref
	data-slot="toggle-group"
	data-variant={variant}
	class={cn(
		variant === 'segment' ? 'flex w-full' : 'flex flex-wrap items-center gap-x-2 gap-y-3',
		className
	)}
	{...restProps}
/>
