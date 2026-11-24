<script lang="ts">
	import ThreadView from '#lib/components/content/ThreadView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.post.title} · {data.course.code}</title></svelte:head>

{#key data.post.id}
	<ThreadView
		initialPost={data.post}
		initialReplies={data.replies}
		linkedReply={data.linkedReply}
		initialReactions={data.reactions}
		initialLoadedAt={data.threadLoadedAt}
	/>
{/key}
