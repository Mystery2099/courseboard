<script lang="ts">
	import ReviewChannelView from '#lib/components/content/ReviewChannelView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#key data.course.id}
	<ReviewChannelView
		course={data.course}
		initialPage={data.postPage}
		initialContext={data.reviewContext}
		initialLoadedAt={data.postPageLoadedAt}
	/>
{/key}
