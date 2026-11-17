<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export const buttonVariants = tv({
		base: "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
		variants: {
			// Each variant names its background and content colors, and the state layer mixes them
			// for hover and press (layout.css). Filled and tonal buttons also lift on hover.
			variant: {
				filled:
					'state-layer bg-primary text-on-primary [--state-base:var(--primary)] [--state-color:var(--on-surface)] hover:shadow-raised active:shadow-none',
				tonal:
					'state-layer bg-secondary-container text-on-secondary-container [--state-base:var(--secondary-container)] [--state-color:var(--on-secondary-container)] hover:shadow-raised active:shadow-none',
				outlined: 'state-layer-primary border border-outline text-primary hover:border-primary',
				text: 'state-layer-primary text-primary',
				// For actions that remove something: tints red instead of primary.
				'destructive-text': 'state-layer-primary text-error [--state-tint:var(--error)]',
				destructive:
					'state-layer bg-error text-on-error [--state-base:var(--error)] [--state-color:var(--on-surface)] hover:shadow-raised active:shadow-none',
				ghost: 'state-layer text-on-surface-variant hover:text-on-surface'
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
	<!-- Callers pass an href already built with resolve(). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
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
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
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
