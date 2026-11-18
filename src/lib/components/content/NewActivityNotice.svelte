<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let {
		label,
		isShowing,
		onShow
	}: {
		/** Empty while there is nothing new. */
		label: string;
		isShowing: boolean;
		onShow: () => void;
	} = $props();
</script>

<!-- Takes no height, so content below doesn't move when the notice appears. -->
<div class="sticky top-3 z-10 flex h-0 justify-center" role="status">
	{#if label}
		<Button size="compact" class="shadow-floating" disabled={isShowing} onclick={onShow}
			>{isShowing ? m.common_loading() : label}</Button
		>
	{/if}
</div>
