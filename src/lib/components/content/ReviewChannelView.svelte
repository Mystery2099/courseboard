<script lang="ts">
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import { ReviewApiClient, reviewQueryKeys } from '#lib/client/content/ReviewApiClient.ts';
	import type { HistoryCourseResponse } from '#lib/contracts/AcademicHistoryContract.ts';
	import type { PostListResponse } from '#lib/contracts/PostContract.ts';
	import type { CourseReviewContextResponse } from '#lib/contracts/ReviewContract.ts';
	import HistoryEntryEditorDialog from '#lib/components/history/HistoryEntryEditorDialog.svelte';
	import PostList from './PostList.svelte';
	import ReviewForm from './ReviewForm.svelte';

	let {
		course,
		initialPage,
		initialContext,
		initialLoadedAt
	}: {
		course: HistoryCourseResponse;
		initialPage: PostListResponse;
		initialContext: CourseReviewContextResponse;
		initialLoadedAt: number;
	} = $props();

	const queryClient = useQueryClient();
	const contextQuery = createQuery(() => ({
		queryKey: reviewQueryKeys.context(course.id),
		queryFn: () => ReviewApiClient.getCourseContext(course.id),
		initialData: initialContext,
		initialDataUpdatedAt: initialLoadedAt
	}));
	const context = $derived(contextQuery.data);
	const statistics = $derived(context.statistics);
	let isComposerOpen = $state(false);
	let isHistoryEditorOpen = $state(false);
	let savedReviewId = $state<string | null>(null);
</script>

<h2 class="text-xl font-semibold">Reviews</h2>
<dl class="mt-4 grid grid-cols-3 gap-3 border-y py-4">
	<div class="flex flex-col-reverse">
		<dt class="text-sm text-slate-600">Reviews</dt>
		<dd class="text-2xl font-semibold">{statistics.reviewCount}</dd>
	</div>
	<div class="flex flex-col-reverse">
		<dt class="text-sm text-slate-600">Avg. workload</dt>
		<dd class="text-2xl font-semibold">
			{statistics.averageWorkload === null ? 'Not yet' : statistics.averageWorkload.toFixed(1)}
			{#if statistics.averageWorkload !== null}<span class="text-sm">/ 5</span>{/if}
		</dd>
	</div>
	<div class="flex flex-col-reverse">
		<dt class="text-sm text-slate-600">Would take again</dt>
		<dd class="text-2xl font-semibold">
			{statistics.wouldTakeAgainPercentage === null
				? 'Not yet'
				: `${Math.round(statistics.wouldTakeAgainPercentage)}%`}
		</dd>
	</div>
</dl>
<p class="mt-2 text-sm text-slate-600">
	Based on published reviews, not private academic histories.
</p>
{#if contextQuery.isError}
	<p class="mt-3 text-sm text-red-700" role="alert">
		Review details couldn't be refreshed.
		<button type="button" class="underline" onclick={() => contextQuery.refetch()}>Try again</button
		>
	</p>
{/if}

{#if savedReviewId}
	<p class="mt-4 text-sm" role="status">
		Your review was published.
		<a
			class="font-semibold text-blue-700"
			href={resolve('/(app)/courses/[courseId]/reviews/[postId]', {
				courseId: course.id,
				postId: savedReviewId
			})}>Open your review</a
		>
	</p>
{/if}

{#if context.ownReviewId && !isComposerOpen}
	<a
		class="mt-4 inline-block min-h-11 rounded-full border px-5 py-2 font-semibold text-blue-700"
		href={resolve('/(app)/courses/[courseId]/reviews/[postId]', {
			courseId: course.id,
			postId: context.ownReviewId
		})}>Open or edit your review</a
	>
{:else if context.attempts.length === 0 && !isComposerOpen}
	<div class="mt-4 rounded-[20px] border p-4">
		<p class="font-semibold">Add this course to your history to write a review.</p>
		<p class="mt-1 text-sm text-slate-600">
			A Taking or Took entry is needed. Planning and following don’t qualify. Your history stays
			private unless you choose otherwise.
		</p>
		<button
			type="button"
			class="mt-3 min-h-11 rounded-full border px-5 py-2 font-semibold text-blue-700"
			onclick={() => (isHistoryEditorOpen = true)}>Add to my history</button
		>
	</div>
{:else}
	<details bind:open={isComposerOpen} class="mt-4 rounded-[20px] border bg-white p-4">
		<summary class="min-h-11 cursor-pointer py-2 font-semibold text-blue-700">
			Write a review
		</summary>
		<div class="mt-4">
			<ReviewForm
				courseId={course.id}
				attempts={context.attempts}
				onSaved={(post) => {
					savedReviewId = post.id;
					isComposerOpen = false;
				}}
				onCancel={() => (isComposerOpen = false)}
			/>
		</div>
	</details>
{/if}

<PostList
	courseId={course.id}
	kind="review"
	{initialPage}
	initialPageLoadedAt={initialLoadedAt}
	emptyMessage="No reviews yet. Be the first to share your experience."
/>

<HistoryEntryEditorDialog
	bind:open={isHistoryEditorOpen}
	presetCourse={course}
	onSaved={() => {
		void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.context(course.id) });
		isComposerOpen = true;
	}}
/>
