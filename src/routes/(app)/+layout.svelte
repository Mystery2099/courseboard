<script lang="ts">
	import { resolve } from '$app/paths';
	import { UserButton } from 'svelte-clerk';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<header class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
	<nav class="flex gap-4 text-sm">
		<a href={resolve('/(app)/explore')}>Explore</a>
		{#if data.currentUser?.role === 'administrator'}
			<a href={resolve('/(app)/admin/invitations')}>Invitations</a>
			<a href={resolve('/(app)/admin/catalog')}>Catalog</a>
		{/if}
	</nav>
	<UserButton />
</header>

{#if data.followedCourses.length > 0}
	<nav aria-label="Followed courses" class="mx-auto max-w-4xl px-4">
		<ul class="flex flex-wrap gap-2 text-sm">
			{#each data.followedCourses as course (course.id)}
				<li>
					<a
						href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
						title="{course.title}, {course.institutionName}"
						class="rounded border px-2 py-0.5">{course.code}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<main class="mx-auto max-w-4xl px-4 py-8">
	{@render children()}
</main>
