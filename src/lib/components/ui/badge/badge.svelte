<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	// Status chips (course status, post type, Answered, Locked): full radius and never interactive.
	// Self-reported labels use `outline`, never a filled or checked look.
	export const badgeVariants = tv({
		base: 'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5',
		variants: {
			variant: {
				neutral: 'bg-surface-container text-on-surface',
				primary: 'bg-primary-container text-on-primary-container',
				secondary: 'bg-secondary-container text-on-secondary-container',
				tertiary: 'bg-tertiary-container text-on-tertiary-container',
				success: 'bg-success-container text-on-success-container',
				outline: 'border border-outline font-medium text-on-surface-variant'
			}
		},
		defaultVariants: {
			variant: 'neutral'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'neutral',
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
