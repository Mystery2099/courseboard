<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	// `chip` is the filter chip: 8px radius, selection shown by fill with no checkmark, drawn 36px
	// tall with an invisible extension that keeps the touch target at least 44px. `segment` is one
	// part of an outlined segmented control. Links styled as chips mark selection with aria-current.
	export const toggleVariants = tv({
		base: "relative inline-flex shrink-0 items-center justify-center gap-1.5 text-sm whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				chip: 'min-h-9 rounded-chip border border-outline px-4 text-on-surface after:absolute after:inset-x-0 after:-inset-y-1.5 state-layer data-[state=on]:border-transparent data-[state=on]:[--state-base:var(--secondary-container)] data-[state=on]:[--state-color:var(--on-secondary-container)] aria-[current=page]:[--state-base:var(--secondary-container)] aria-[current=page]:[--state-color:var(--on-secondary-container)] data-[state=on]:bg-secondary-container data-[state=on]:font-semibold data-[state=on]:text-on-secondary-container aria-[current=page]:border-transparent aria-[current=page]:bg-secondary-container aria-[current=page]:font-semibold aria-[current=page]:text-on-secondary-container',
				segment:
					'min-h-11 flex-1 border border-outline px-4 font-semibold text-on-surface not-first:-ml-px first:rounded-l-full last:rounded-r-full state-layer data-[state=on]:z-1 data-[state=on]:border-primary data-[state=on]:[--state-base:var(--secondary-container)] data-[state=on]:[--state-color:var(--on-secondary-container)] data-[state=on]:bg-secondary-container data-[state=on]:text-on-secondary-container'
			}
		},
		defaultVariants: {
			variant: 'chip'
		}
	});

	export type ToggleVariant = VariantProps<typeof toggleVariants>['variant'];
	export type ToggleVariants = VariantProps<typeof toggleVariants>;
</script>

<script lang="ts">
	import { Toggle as TogglePrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		pressed = $bindable(false),
		class: className,
		variant = 'chip',
		...restProps
	}: TogglePrimitive.RootProps & {
		variant?: ToggleVariant;
	} = $props();
</script>

<TogglePrimitive.Root
	bind:ref
	bind:pressed
	data-slot="toggle"
	class={cn(toggleVariants({ variant }), className)}
	{...restProps}
/>
