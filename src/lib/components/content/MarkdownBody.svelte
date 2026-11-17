<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { MarkdownRenderer } from '#lib/markdown/MarkdownRenderer.ts';

	let {
		markdown,
		topHeadingLevel,
		class: className
	}: { markdown: string; topHeadingLevel: 2 | 3; class?: ClassValue } = $props();

	const html = $derived(MarkdownRenderer.toHtml(markdown, topHeadingLevel));
</script>

<!-- MarkdownRenderer escapes raw HTML and refuses unsafe links and images. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class={['markdown-body', className]}>{@html html}</div>
