<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { m } from '#lib/paraglide/messages.js';
	import { createQuery } from '@tanstack/svelte-query';
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
<dl class="mt-3 grid grid-cols-3 gap-2">
	<div class="rounded-card bg-surface-container px-3 py-2">
		<dt class="text-xs text-on-surface-variant tablet:text-sm">{m.reviews_statistic_count()}</dt>
		<dd class="mt-0.5 font-heading text-xl font-bold">{statistics.reviewCount}</dd>
	</div>
	<div class="rounded-card bg-surface-container px-3 py-2">
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
	<div class="rounded-card bg-surface-container px-3 py-2">
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
		<button
			type="button"
			class="font-semibold underline underline-offset-2 hover:decoration-2"
			onclick={() => contextQuery.refetch()}>{m.common_try_again()}</button
		>
	</p>
{/if}

{#if savedReviewId}
	<p class="mt-4 text-sm" role="status">
		{m.reviews_published()}
		<a
			class="font-semibold text-primary underline-offset-2 hover:underline"
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
{:else}
	<details
		bind:open={isComposerOpen}
		class="group/disclosure mt-4 rounded-card border bg-surface px-4 py-2 open:pb-4"
	>
		<summary
			class="-mx-3 flex min-h-11 items-center rounded-full state-layer-primary px-3 font-semibold text-primary transition-colors duration-150"
		>
			{m.reviews_write()}
			<ChevronDown
				size={20}
				class="ml-auto shrink-0 transition-transform duration-150 group-open/disclosure:rotate-180"
				aria-hidden="true"
			/>
		</summary>
		<!-- Who may review is explained once someone asks to write one, so reviews come first. -->
		{#if context.attempts.length === 0}
			<div class="mt-3">
				<p class="font-semibold">{m.reviews_history_required()}</p>
				<p class="mt-1 text-sm text-on-surface-variant">
					{m.reviews_history_required_detail()}
				</p>
				<Button variant="outlined" class="mt-3" onclick={() => (isHistoryEditorOpen = true)}
					>{m.common_add_to_history()}</Button
				>
			</div>
		{:else}
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
		{/if}
	</details>
{/if}

<PostList
	courseId={course.id}
	kind="review"
	{initialPage}
	initialPageLoadedAt={initialLoadedAt}
	emptyMessage={m.reviews_empty()}
/>

<!--
	The form refreshes this context when it saves, so an entry that makes the course reviewable swaps
	the open disclosure's explanation for the review form. A Planning entry doesn't, so it stays.
-->
<HistoryEntryEditorDialog bind:open={isHistoryEditorOpen} presetCourse={course} />
