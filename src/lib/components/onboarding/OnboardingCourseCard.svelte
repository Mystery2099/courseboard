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

	// Only the entry this step creates can be removed here; anything else is edited on the profile.
	const entryForThisTerm = $derived(
		historyEntries.find(
			(entry) =>
				entry.status === 'taking' &&
				entry.term?.season === term.season &&
				entry.term.year === term.year
		)
	);

	const historyMutation = createMutation(() => ({
		mutationFn: async () => {
			if (entryForThisTerm) return AcademicHistoryApiClient.deleteEntry(entryForThisTerm.id);
			await AcademicHistoryApiClient.createEntry({
				courseId: course.id,
				status: 'taking',
				term,
				visibility: 'private',
				privateNote: ''
			});
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

	const isInHistory = $derived(historyEntries.length > 0);
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
			class={[chipClass, isInHistory ? selectedChipClass : unselectedChipClass]}
			aria-pressed={isInHistory}
			disabled={historyMutation.isPending || (isInHistory && !entryForThisTerm)}
			onclick={() => historyMutation.mutate()}
		>
			{#if isInHistory}<Check size={16} /> In my history{:else}<Plus size={16} /> Add to history{/if}
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
