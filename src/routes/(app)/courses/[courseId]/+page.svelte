<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import PostList from '#lib/components/content/PostList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h2 class="sr-only">{m.course_channel_overview()}</h2>
{#key data.course.id}
	<PostList
		courseId={data.course.id}
		kind={null}
		initialPage={data.postPage}
		initialPageLoadedAt={data.postPageLoadedAt}
		emptyMessage={m.course_overview_empty()}
	/>
{/key}
