<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { MarkdownRenderer } from '#lib/markdown/MarkdownRenderer.ts';
	import { LinkPreviewResolver } from '#lib/markdown/LinkPreviewResolver.ts';
	import LinkPreviewCard from './LinkPreviewCard.svelte';

	let {
		markdown,
		topHeadingLevel,
		mentionedUsernames = [],
		class: className
	}: {
		markdown: string;
		topHeadingLevel: 2 | 3;
		/** Mentions the server confirmed; text not yet sent has none, so its `@name` stays plain. */
		mentionedUsernames?: readonly string[];
		class?: ClassValue;
	} = $props();

	const html = $derived(MarkdownRenderer.toHtml(markdown, topHeadingLevel, mentionedUsernames));
	const linkPreviews = $derived(LinkPreviewResolver.resolveAll(MarkdownRenderer.toLinks(markdown)));
</script>

<!-- MarkdownRenderer escapes raw HTML and refuses unsafe links and images. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class={['markdown-body', className]}>{@html html}</div>
{#if linkPreviews.length > 0}
	<div class="mt-3 flex flex-col gap-2">
		{#each linkPreviews as preview (preview.sourceUrl)}
			<LinkPreviewCard {preview} />
		{/each}
	</div>
{/if}
