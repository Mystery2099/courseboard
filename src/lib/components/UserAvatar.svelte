<script lang="ts">
	import { cn } from '#lib/utils.ts';

	interface Props {
		username: string;
		displayName: string;
		/** A profile photo uploaded through Clerk; initials are shown without one. */
		imageUrl?: string | null;
		size?: number;
		class?: string;
	}

	let { username, displayName, imageUrl = null, size = 40, class: className }: Props = $props();

	const initials = $derived(
		displayName
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => [...word][0].toUpperCase())
			.join('')
	);

	// Container roles rather than generated hues, so initials keep their contrast in every theme.
	const COLOR_PAIRS = [
		'bg-primary-container text-on-primary-container',
		'bg-tertiary-container text-on-tertiary-container',
		'bg-secondary-container text-on-secondary-container',
		'bg-success-container text-on-success-container'
	];

	/** The same username always gets the same colors, so a person keeps one look everywhere. */
	const colorPair = $derived(
		COLOR_PAIRS[
			[...username].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 997, 7) %
				COLOR_PAIRS.length
		]
	);

	const SHAPE = 'rounded-full';
</script>

{#if imageUrl}
	<img
		src={imageUrl}
		alt=""
		width={size}
		height={size}
		class={cn('shrink-0 object-cover', SHAPE, className)}
		style="width: {size}px; height: {size}px;"
	/>
{:else}
	<span
		class={cn(
			'inline-flex shrink-0 items-center justify-center font-heading font-bold',
			SHAPE,
			colorPair,
			className
		)}
		style="width: {size}px; height: {size}px; font-size: {size * 0.4}px;"
		aria-hidden="true">{initials}</span
	>
{/if}
