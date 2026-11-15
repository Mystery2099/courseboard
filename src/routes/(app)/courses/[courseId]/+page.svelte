<script lang="ts">
	import PostList from '#lib/components/content/PostList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h2 class="sr-only">Overview</h2>
{#key data.course.id}
	<PostList
		courseId={data.course.id}
		kind={null}
		initialPage={data.postPage}
		initialPageLoadedAt={data.postPageLoadedAt}
		emptyMessage="Nothing has been posted in this course yet. Ask a question or start a discussion from their channels."
	/>
{/key}
