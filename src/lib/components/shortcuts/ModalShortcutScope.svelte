<script lang="ts">
	import type { Snippet } from 'svelte';
	import { HotkeysProvider } from '@tanstack/svelte-hotkeys';

	let { children }: { children: Snippet } = $props();

	// Each open overlay needs its own scope name, so one opened from another doesn't share it.
	const instanceId = $props.id();
	const scope = `modal-${instanceId}`;
</script>

<!--
	Mounted inside an open dialog, alert, or sheet. Page shortcuts, such as moving to another course,
	stay off until it closes; global ones, such as the shortcuts list and sending, keep working.
-->
<HotkeysProvider {scope} exclusive={{ allow: ['global'] }}>
	{@render children()}
</HotkeysProvider>
