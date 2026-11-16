<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export const buttonVariants = tv({
		base: "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
		variants: {
			variant: {
				filled: 'bg-primary text-on-primary hover:bg-primary/90',
				tonal: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
				outlined: 'border border-outline text-primary hover:bg-primary/8',
				text: 'text-primary hover:bg-primary/8',
				destructive: 'bg-error text-on-error hover:bg-error/90',
				ghost: 'text-on-surface-variant hover:bg-on-surface/8'
			},
			// Touch targets stay at least 44px on phones; desktop controls may shrink to 40 or 36px.
			size: {
				regular: 'min-h-11 px-5 desktop:min-h-10',
				compact: 'min-h-11 px-4 text-sm desktop:min-h-9',
				icon: 'size-11'
			}
		},
		defaultVariants: {
			variant: 'filled',
			size: 'regular'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'filled',
		size = 'regular',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
