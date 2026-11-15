<script lang="ts">
	import { buttonClass } from '#lib/components/ui/ControlStyles.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import Check from 'lucide-svelte/icons/check';
	import Plus from 'lucide-svelte/icons/plus';
	import { CourseFollowingApiClient } from '#lib/client/catalog/CourseFollowingApiClient.ts';
	import { courseCatalogQueryKeys } from '#lib/client/catalog/CourseCatalogApiClient.ts';
	import {
		AcademicHistoryApiClient,
		academicHistoryQueryKeys
	} from '#lib/client/history/AcademicHistoryApiClient.ts';
	import { currentTerm } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { OwnHistoryEntryResponse } from '#lib/contracts/AcademicHistoryContract.ts';
	import type { CourseSummaryResponse } from '#lib/contracts/CourseCatalogContract.ts';

	let {
		course,
		institutionId,
		historyEntries
	}: {
		course: CourseSummaryResponse;
		institutionId: string;
		/** The user's own entries for this course. */
		historyEntries: OwnHistoryEntryResponse[];
	} = $props();

	const queryClient = useQueryClient();
	const term = currentTerm();

	// Only the entry this card created can be removed here. One that already existed may carry a
	// note or be visible, so it is changed from the profile.
	let createdEntryId = $state<string | null>(null);

	// Earlier attempts in other terms don't count: the step asks about this term only. The created
	// entry counts before the history list refreshes, so a second click can't record a duplicate.
	const isTakingThisTerm = $derived(
		createdEntryId !== null ||
			historyEntries.some(
				(entry) =>
					entry.status === 'taking' &&
					entry.term?.season === term.season &&
					entry.term.year === term.year
			)
	);

	const historyMutation = createMutation(() => ({
		mutationFn: async () => {
			if (createdEntryId) {
				await AcademicHistoryApiClient.deleteEntry(createdEntryId);
				createdEntryId = null;
				return;
			}
			const entry = await AcademicHistoryApiClient.createEntry({
				courseId: course.id,
				status: 'taking',
				term,
				visibility: 'private',
				privateNote: ''
			});
			createdEntryId = entry.id;
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: academicHistoryQueryKeys.all })
	}));

	const followingMutation = createMutation(() => ({
		mutationFn: async () => {
			if (course.isFollowed) return CourseFollowingApiClient.unfollowCourse(course.id);
			await CourseFollowingApiClient.followCourse(course.id);
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: courseCatalogQueryKeys.courses(institutionId) })
	}));
</script>

<li class="rounded-card border bg-surface p-4">
	<p class="font-mono text-sm font-semibold text-primary">{course.code}</p>
	<p class="font-semibold">{course.title}</p>
	<div class="mt-3 flex flex-wrap gap-2">
		<button
			type="button"
			class={buttonClass(isTakingThisTerm ? 'tonal' : 'outlined', 'compact')}
			aria-pressed={isTakingThisTerm}
			disabled={historyMutation.isPending || (isTakingThisTerm && !createdEntryId)}
			onclick={() => historyMutation.mutate()}
		>
			{#if isTakingThisTerm}<Check size={16} /> {m.onboarding_course_in_history()}{:else}<Plus
					size={16}
				/>
				{m.onboarding_course_add_to_history()}{/if}
		</button>
		<button
			type="button"
			class={buttonClass(course.isFollowed ? 'tonal' : 'outlined', 'compact')}
			aria-pressed={course.isFollowed}
			disabled={followingMutation.isPending}
			onclick={() => followingMutation.mutate()}
		>
			{#if course.isFollowed}<Check size={16} />
				{m.course_space_following()}{:else}{m.course_space_follow()}{/if}
		</button>
	</div>
	{#if historyMutation.isError || followingMutation.isError}
		<p class="mt-2 text-sm text-error" role="alert">{m.onboarding_course_change_failed()}</p>
	{/if}
</li>
