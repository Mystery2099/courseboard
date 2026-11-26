<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { resolve } from '$app/paths';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import AtSign from 'lucide-svelte/icons/at-sign';
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
		isMentionsCurrent,
		isProfileCurrent,
		isAdministrator,
		profile
	}: {
		followedCourses: FollowedCourseResponse[];
		currentCourseId: string | null;
		isExploreCurrent: boolean;
		isSearchCurrent: boolean;
		isMentionsCurrent: boolean;
		isProfileCurrent: boolean;
		isAdministrator: boolean;
		profile: { username: string; displayName: string; imageUrl: string | null };
	} = $props();
</script>

<Tooltip.Provider delayDuration={300}>
	<nav
		aria-label={m.navigation_spaces()}
		class="sticky top-0 flex h-dvh w-[72px] shrink-0 flex-col items-center gap-3 bg-rail py-4 text-on-rail [&_*]:outline-gold"
	>
		<a
			href={resolve('/(app)/explore')}
			aria-label={m.navigation_explore()}
			aria-current={isExploreCurrent ? 'page' : undefined}
			class={['rail-button', isExploreCurrent && 'rail-current']}
		>
			<Compass size={22} />
		</a>
		<a
			href={resolve('/(app)/search')}
			aria-label={m.navigation_search()}
			aria-current={isSearchCurrent ? 'page' : undefined}
			class={['rail-button', isSearchCurrent && 'rail-current']}
		>
			<Search size={22} />
		</a>
		<a
			href={resolve('/(app)/mentions')}
			aria-label={m.navigation_mentions()}
			aria-current={isMentionsCurrent ? 'page' : undefined}
			class={['rail-button', isMentionsCurrent && 'rail-current']}
		>
			<AtSign size={22} />
		</a>
		<hr class="w-8 border-on-rail/30" />
		<ul class="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-y-auto">
			{#each followedCourses as course (course.id)}
				<li>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<a
									{...props}
									class={[
										'group/tile relative block rounded-tile',
										course.id === currentCourseId && 'rail-current'
									]}
									href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
									aria-label="{course.code} {course.title}"
									aria-current={course.id === currentCourseId ? 'page' : undefined}
								>
									<CourseCodeTile
										code={course.code}
										tone="rail"
										isCurrent={course.id === currentCourseId}
									/>
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
				class="rail-button"
			>
				<Shield size={22} />
			</a>
		{/if}
		<a
			href={resolve('/(app)/profile')}
			aria-label={m.navigation_your_profile()}
			aria-current={isProfileCurrent ? 'page' : undefined}
			class={[
				'relative flex size-12 items-center justify-center rounded-full state-layer transition-colors duration-150 [--state-color:var(--on-rail)]',
				isProfileCurrent && 'rail-current'
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

<style>
	/* Rail controls sit on navy in both themes, so they tint with white instead of the surface roles. */
	.rail-button {
		position: relative;
		display: flex;
		width: 3rem;
		height: 3rem;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-tile);
		background-color: color-mix(in oklab, var(--rail), var(--on-rail) 14%);
		transition: background-color 150ms;

		&:hover {
			background-color: color-mix(in oklab, var(--rail), var(--on-rail) 24%);
		}
	}

	/* Discord's pill: a gold bar on the rail's edge beside the current space. */
	.rail-current::before {
		content: '';
		position: absolute;
		top: 50%;
		left: -0.75rem;
		width: 0.375rem;
		height: 2.5rem;
		translate: 0 -50%;
		border-radius: 0 0.375rem 0.375rem 0;
		background-color: var(--gold);
	}
</style>
