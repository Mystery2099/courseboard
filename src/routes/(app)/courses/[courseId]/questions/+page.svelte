<script lang="ts">
	import ThreadChannelView from '#lib/components/content/ThreadChannelView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#key data.course.id}
	<ThreadChannelView
		courseId={data.course.id}
		kind="question"
		initialPage={data.postPage}
		initialPageLoadedAt={data.postPageLoadedAt}
	/>
{/key}
