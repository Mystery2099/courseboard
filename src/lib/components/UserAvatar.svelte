<script lang="ts">
	interface Props {
		username: string;
		displayName: string;
		/** A profile photo uploaded through Clerk; initials are shown without one. */
		imageUrl?: string | null;
		size?: number;
	}

	let { username, displayName, imageUrl = null, size = 40 }: Props = $props();

	const initials = $derived(
		displayName
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => [...word][0].toUpperCase())
			.join('')
	);

	/** The same username always gets the same hue, so a person keeps one color everywhere. */
	const hue = $derived(
		[...username].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 360, 7)
	);
</script>

{#if imageUrl}
	<img
		src={imageUrl}
		alt=""
		width={size}
		height={size}
		class="shrink-0 rounded-full object-cover"
		style="width: {size}px; height: {size}px;"
	/>
{:else}
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
		style="width: {size}px; height: {size}px; font-size: {size *
			0.4}px; background-color: hsl({hue} 55% 38%);"
		aria-hidden="true">{initials}</span
	>
{/if}
