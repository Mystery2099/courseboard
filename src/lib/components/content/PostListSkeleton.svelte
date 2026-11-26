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
	<!-- Static, matching a post card's byline, title and reply count, as the spec asks: no shimmer or pulse. -->
	<ul class="mt-4 flex flex-col gap-2.5" aria-hidden="true">
		{#each { length: PLACEHOLDER_ROW_COUNT }, index (index)}
			<li class="rounded-card border bg-surface px-4 pt-3">
				<span class="flex items-center gap-2.5">
					<span class="size-7 rounded-full bg-surface-container"></span>
					<span class="h-4 w-2/5 rounded-md bg-surface-container"></span>
				</span>
				<span class="mt-2 block h-6 w-3/4 rounded-md bg-surface-container"></span>
				<span class="-mx-4 mt-3 flex min-h-11 items-center border-t px-4">
					<span class="h-4 w-1/4 rounded-md bg-surface-container"></span>
				</span>
			</li>
		{/each}
	</ul>
{/if}
