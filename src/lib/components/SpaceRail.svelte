<script lang="ts">
	import { resolve } from '$app/paths';
	import { Compass, Shield } from 'lucide-svelte';
	import { UserButton } from 'svelte-clerk';
	import type { FollowedCourseResponse } from '#lib/contracts/CourseFollowingContract.ts';
	import CourseCodeTile from './CourseCodeTile.svelte';

	let {
		followedCourses,
		currentCourseId,
		isExploreCurrent,
		isAdministrator
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourseId: string | null;
		isExploreCurrent: boolean;
		isAdministrator: boolean;
	} = $props();
</script>

<nav
	aria-label="Spaces"
	class="sticky top-0 flex h-dvh w-[72px] shrink-0 flex-col items-center gap-3 border-r bg-slate-100 py-4"
>
	<a
		href={resolve('/(app)/explore')}
		aria-label="Explore"
		aria-current={isExploreCurrent ? 'page' : undefined}
		class={[
			'flex size-12 items-center justify-center rounded-[15px] bg-white',
			isExploreCurrent && 'ring-3 ring-blue-700'
		]}
	>
		<Compass size={22} />
	</a>
	<hr class="w-8" />
	<ul class="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto">
		{#each followedCourses as course (course.id)}
			<li>
				<a
					href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
					title="{course.code} · {course.title}, {course.institutionName}"
					aria-label="{course.code} {course.title}"
					aria-current={course.id === currentCourseId ? 'page' : undefined}
				>
					<CourseCodeTile code={course.code} isCurrent={course.id === currentCourseId} />
				</a>
			</li>
		{/each}
	</ul>
	{#if isAdministrator}
		<a
			href={resolve('/(app)/admin/invitations')}
			aria-label="Admin"
			class="flex size-12 items-center justify-center rounded-[15px] bg-slate-800 text-white"
		>
			<Shield size={22} />
		</a>
	{/if}
	<UserButton />
</nav>
