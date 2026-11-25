<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/** Loads faster than this show nothing, since a placeholder that flashes by feels jumpy. */
	const SKELETON_DELAY_MS = 1000;
	const PLACEHOLDER_ROW_COUNT = 4;

	let isShown = $state(false);
	$effect(() => {
		const timer = setTimeout(() => (isShown = true), SKELETON_DELAY_MS);
		return () => clearTimeout(timer);
	});
</script>

<p class="sr-only" role="status">{isShown ? m.common_loading() : ''}</p>
{#if isShown}
	<!-- Static, matching a post row's title and byline, as the spec asks: no shimmer or pulse. -->
	<ul class="mt-4 divide-y overflow-hidden rounded-card border bg-surface" aria-hidden="true">
		{#each { length: PLACEHOLDER_ROW_COUNT }, index (index)}
			<li class="px-4 py-3">
				<span class="mt-1 block h-6 w-3/4 rounded-md bg-surface-container"></span>
				<span class="mt-1.5 block h-4 w-2/5 rounded-md bg-surface-container"></span>
			</li>
		{/each}
	</ul>
{/if}
