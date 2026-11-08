<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Explore</h1>

{#if !data.catalog}
	<p class="mt-2 text-sm opacity-70">No courses have been added yet.</p>
{:else}
	<form method="GET" class="mt-4 flex flex-wrap items-end gap-2">
		<label class="flex flex-col text-sm">
			Institution
			<select name="institutionId" class="mt-1 rounded border px-2 py-1">
				{#each data.institutions as institution (institution.id)}
					<option value={institution.id} selected={institution.id === data.catalog.institution.id}
						>{institution.name}</option
					>
				{/each}
			</select>
		</label>
		<button type="submit" class="rounded border px-4 py-1">Show courses</button>
	</form>

	{#if form?.followingError}<p class="mt-4 text-sm" role="alert">{form.followingError}</p>{/if}

	<h2 class="mt-6 text-lg font-semibold">{data.catalog.institution.name}</h2>
	<ul class="mt-2">
		{#each data.catalog.courses as course (course.id)}
			<li class="flex items-center justify-between gap-4 border-t py-2">
				<a href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}>
					<span class="font-medium">{course.code}</span>
					{course.title}
				</a>
				<form method="POST" action={course.isFollowed ? '?/unfollow' : '?/follow'} use:enhance>
					<input type="hidden" name="courseId" value={course.id} />
					<button type="submit" class="rounded border px-3 py-1 text-sm">
						{course.isFollowed ? 'Unfollow' : 'Follow'}
					</button>
				</form>
			</li>
		{:else}
			<li class="border-t py-2 text-sm opacity-70">This institution has no courses yet.</li>
		{/each}
	</ul>

	{#if data.catalog.nextCursor}
		<a
			class="mt-4 inline-block underline"
			href="?institutionId={data.catalog.institution.id}&after={encodeURIComponent(
				data.catalog.nextCursor
			)}">More courses</a
		>
	{/if}
{/if}
