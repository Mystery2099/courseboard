<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let { id }: { id: string } = $props();
</script>

<p {id} class="text-sm text-on-surface-variant">{m.markdown_formatting_help()}</p>
