<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { resolve } from '$app/paths';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import Compass from 'lucide-svelte/icons/compass';
	import Search from 'lucide-svelte/icons/search';
	import Shield from 'lucide-svelte/icons/shield';
	import type { FollowedCourseResponse } from '#lib/contracts/CourseFollowingContract.ts';
	import CourseCodeTile from './CourseCodeTile.svelte';
	import UserAvatar from './UserAvatar.svelte';

	let {
		followedCourses,
		currentCourseId,
		isExploreCurrent,
		isSearchCurrent,
		isProfileCurrent,
		isAdministrator,
		profile
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourseId: string | null;
		isExploreCurrent: boolean;
		isSearchCurrent: boolean;
		isProfileCurrent: boolean;
		isAdministrator: boolean;
		profile: { username: string; displayName: string; imageUrl: string | null };
	} = $props();
</script>

<Tooltip.Provider delayDuration={300}>
	<nav
		aria-label={m.navigation_spaces()}
		class="sticky top-0 flex h-dvh w-[72px] shrink-0 flex-col items-center gap-3 border-r bg-surface-container py-4"
	>
		<a
			href={resolve('/(app)/explore')}
			aria-label={m.navigation_explore()}
			aria-current={isExploreCurrent ? 'page' : undefined}
			class={[
				'flex size-12 items-center justify-center rounded-tile state-layer bg-surface transition-colors duration-150 [--state-base:var(--surface)]',
				isExploreCurrent && 'ring-3 ring-primary'
			]}
		>
			<Compass size={22} />
		</a>
		<a
			href={resolve('/(app)/search')}
			aria-label={m.navigation_search()}
			aria-current={isSearchCurrent ? 'page' : undefined}
			class={[
				'flex size-12 items-center justify-center rounded-tile state-layer bg-surface transition-colors duration-150 [--state-base:var(--surface)]',
				isSearchCurrent && 'ring-3 ring-primary'
			]}
		>
			<Search size={22} />
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
									class="group/tile block rounded-tile"
									href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
									aria-label="{course.code} {course.title}"
									aria-current={course.id === currentCourseId ? 'page' : undefined}
								>
									<CourseCodeTile code={course.code} isCurrent={course.id === currentCourseId} />
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right" sideOffset={8} class="block">
							<span class="font-mono">{course.code}</span> · {course.title}
							<span class="block text-xs">{course.institutionName}</span>
						</Tooltip.Content>
					</Tooltip.Root>
				</li>
			{/each}
		</ul>
		{#if isAdministrator}
			<a
				href={resolve('/(app)/admin/invitations')}
				aria-label={m.navigation_admin()}
				class="flex size-12 items-center justify-center rounded-tile state-layer bg-inverse-surface text-inverse-on-surface transition-colors duration-150 [--state-base:var(--inverse-surface)] [--state-color:var(--inverse-on-surface)]"
			>
				<Shield size={22} />
			</a>
		{/if}
		<a
			href={resolve('/(app)/profile')}
			aria-label={m.navigation_your_profile()}
			aria-current={isProfileCurrent ? 'page' : undefined}
			class={[
				'flex size-12 items-center justify-center rounded-full state-layer transition-colors duration-150',
				isProfileCurrent && 'ring-3 ring-primary'
			]}
		>
			<UserAvatar
				username={profile.username}
				displayName={profile.displayName}
				imageUrl={profile.imageUrl}
			/>
		</a>
	</nav>
</Tooltip.Provider>
