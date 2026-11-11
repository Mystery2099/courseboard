<script lang="ts">
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

	// Earlier attempts in other terms don't count: the step asks about this term only.
	const isTakingThisTerm = $derived(
		historyEntries.some(
			(entry) =>
				entry.status === 'taking' &&
				entry.term?.season === term.season &&
				entry.term.year === term.year
		)
	);

	// Only the entry this card created can be removed here. One that already existed may carry a
	// note or be visible, so it is changed from the profile.
	let createdEntryId = $state<string | null>(null);
	const createdEntry = $derived(historyEntries.find((entry) => entry.id === createdEntryId));

	const historyMutation = createMutation(() => ({
		mutationFn: async () => {
			if (createdEntry) {
				await AcademicHistoryApiClient.deleteEntry(createdEntry.id);
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

	const chipClass = 'inline-flex items-center gap-1 rounded-full px-4 py-1.5 disabled:opacity-50';
	const selectedChipClass = 'bg-indigo-100 font-semibold';
	const unselectedChipClass = 'border font-semibold text-blue-700';
</script>

<li class="rounded-[20px] border bg-white p-4">
	<p class="font-mono text-sm font-semibold text-blue-700">{course.code}</p>
	<p class="font-semibold">{course.title}</p>
	<div class="mt-3 flex flex-wrap gap-2">
		<button
			type="button"
			class={[chipClass, isTakingThisTerm ? selectedChipClass : unselectedChipClass]}
			aria-pressed={isTakingThisTerm}
			disabled={historyMutation.isPending || (isTakingThisTerm && !createdEntry)}
			onclick={() => historyMutation.mutate()}
		>
			{#if isTakingThisTerm}<Check size={16} /> In my history{:else}<Plus size={16} /> Add to history{/if}
		</button>
		<button
			type="button"
			class={[chipClass, course.isFollowed ? selectedChipClass : unselectedChipClass]}
			aria-pressed={course.isFollowed}
			disabled={followingMutation.isPending}
			onclick={() => followingMutation.mutate()}
		>
			{#if course.isFollowed}<Check size={16} /> Following{:else}Follow{/if}
		</button>
	</div>
	{#if historyMutation.isError || followingMutation.isError}
		<p class="mt-2 text-sm text-red-700" role="alert">That change wasn't saved. Try again.</p>
	{/if}
</li>
