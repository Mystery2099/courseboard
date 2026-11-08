<script lang="ts">
	import { resolve } from '$app/paths';
	import { Tooltip } from 'bits-ui';
	import Compass from 'lucide-svelte/icons/compass';
	import Shield from 'lucide-svelte/icons/shield';
	import type { FollowedCourseResponse } from '#lib/contracts/CourseFollowingContract.ts';
	import CourseCodeTile from './CourseCodeTile.svelte';
	import UserAvatar from './UserAvatar.svelte';

	let {
		followedCourses,
		currentCourseId,
		isExploreCurrent,
		isProfileCurrent,
		isAdministrator,
		profile
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourseId: string | null;
		isExploreCurrent: boolean;
		isProfileCurrent: boolean;
		isAdministrator: boolean;
		profile: { username: string; displayName: string };
	} = $props();
</script>

<Tooltip.Provider delayDuration={300}>
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
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<a
									{...props}
									href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
									aria-label="{course.code} {course.title}"
									aria-current={course.id === currentCourseId ? 'page' : undefined}
								>
									<CourseCodeTile code={course.code} isCurrent={course.id === currentCourseId} />
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								side="right"
								sideOffset={8}
								class="z-50 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
							>
								<span class="font-mono">{course.code}</span> · {course.title}
								<span class="block text-xs text-slate-300">{course.institutionName}</span>
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
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
		<a
			href={resolve('/(app)/profile')}
			aria-label="Your profile"
			aria-current={isProfileCurrent ? 'page' : undefined}
			class={['rounded-full', isProfileCurrent && 'ring-3 ring-blue-700 ring-offset-2']}
		>
			<UserAvatar username={profile.username} displayName={profile.displayName} />
		</a>
	</nav>
</Tooltip.Provider>
