<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/** `allowsMentions` adds `@username` to the help, for fields where the server keeps mentions. */
	let { id, allowsMentions = false }: { id: string; allowsMentions?: boolean } = $props();
</script>

<p {id} class="text-sm text-on-surface-variant">
	{allowsMentions ? m.markdown_formatting_help_with_mentions() : m.markdown_formatting_help()}
</p>
