<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const courseViews = ['Overview', 'Questions', 'Reviews', 'Discussion'];
</script>

<p class="text-sm opacity-70">{data.course.institution.name}</p>
<div class="mt-1 flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-2xl font-semibold">{data.course.code} · {data.course.title}</h1>
	<form method="POST" action={data.course.isFollowed ? '?/unfollow' : '?/follow'} use:enhance>
		<input type="hidden" name="courseId" value={data.course.id} />
		<button type="submit" class="rounded border px-4 py-1">
			{data.course.isFollowed ? 'Unfollow' : 'Follow'}
		</button>
	</form>
</div>
{#if form?.followingError}<p class="mt-2 text-sm" role="alert">{form.followingError}</p>{/if}
<p class="mt-4">{data.course.description}</p>

<nav class="mt-6 flex gap-4 border-b pb-2 text-sm">
	{#each courseViews as courseView (courseView)}
		<span>{courseView}</span>
	{/each}
</nav>
<p class="mt-4 text-sm opacity-70">Nothing has been posted in this course yet.</p>
