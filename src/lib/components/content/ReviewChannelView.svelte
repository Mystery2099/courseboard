<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime.js';
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
	const decimalFormat = new Intl.NumberFormat(getLocale(), {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	const percentFormat = new Intl.NumberFormat(getLocale(), { style: 'percent' });
</script>

<h2 class="text-xl font-semibold">{m.reviews_heading()}</h2>
<dl class="mt-4 grid grid-cols-3 gap-2">
	<div class="rounded-2xl bg-surface-container px-3 py-2.5">
		<dt class="text-xs text-on-surface-variant tablet:text-sm">{m.reviews_statistic_count()}</dt>
		<dd class="mt-0.5 font-heading text-xl font-bold">{statistics.reviewCount}</dd>
	</div>
	<div class="rounded-2xl bg-surface-container px-3 py-2.5">
		<dt class="text-xs text-on-surface-variant tablet:text-sm">{m.reviews_statistic_workload()}</dt>
		<dd class="mt-0.5 font-heading text-xl font-bold">
			{statistics.averageWorkload === null
				? m.reviews_statistic_not_yet()
				: decimalFormat.format(statistics.averageWorkload)}
			{#if statistics.averageWorkload !== null}<span
					class="text-sm font-medium text-on-surface-variant">/ 5</span
				>{/if}
		</dd>
	</div>
	<div class="rounded-2xl bg-surface-container px-3 py-2.5">
		<dt class="text-xs text-on-surface-variant tablet:text-sm">
			{m.reviews_statistic_take_again()}
		</dt>
		<dd class="mt-0.5 font-heading text-xl font-bold">
			{statistics.wouldTakeAgainPercentage === null
				? m.reviews_statistic_not_yet()
				: percentFormat.format(statistics.wouldTakeAgainPercentage / 100)}
		</dd>
	</div>
</dl>
<p class="mt-2 text-sm text-on-surface-variant">
	{m.reviews_statistics_basis()}
</p>
{#if contextQuery.isError}
	<p class="mt-3 text-sm text-error" role="alert">
		{m.reviews_context_refresh_failed()}
		<button type="button" class="underline" onclick={() => contextQuery.refetch()}
			>{m.common_try_again()}</button
		>
	</p>
{/if}

{#if savedReviewId}
	<p class="mt-4 text-sm" role="status">
		{m.reviews_published()}
		<a
			class="font-semibold text-primary"
			href={resolve('/(app)/courses/[courseId]/reviews/[postId]', {
				courseId: course.id,
				postId: savedReviewId
			})}>{m.reviews_open_own()}</a
		>
	</p>
{/if}

{#if context.ownReviewId && !isComposerOpen}
	<Button
		variant="outlined"
		class="mt-4"
		href={resolve('/(app)/courses/[courseId]/reviews/[postId]', {
			courseId: course.id,
			postId: context.ownReviewId
		})}>{m.reviews_open_or_edit_own()}</Button
	>
{:else if context.attempts.length === 0 && !isComposerOpen}
	<div class="mt-4 rounded-card border p-4">
		<p class="font-semibold">{m.reviews_history_required()}</p>
		<p class="mt-1 text-sm text-on-surface-variant">
			{m.reviews_history_required_detail()}
		</p>
		<Button variant="outlined" class="mt-3" onclick={() => (isHistoryEditorOpen = true)}
			>{m.common_add_to_history()}</Button
		>
	</div>
{:else}
	<details bind:open={isComposerOpen} class="mt-4 rounded-card border bg-surface p-4">
		<summary class="min-h-11 cursor-pointer py-2 font-semibold text-primary">
			{m.reviews_write()}
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
	emptyMessage={m.reviews_empty()}
/>

<HistoryEntryEditorDialog
	bind:open={isHistoryEditorOpen}
	presetCourse={course}
	onSaved={() => {
		void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.context(course.id) });
		isComposerOpen = true;
	}}
/>
