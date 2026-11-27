<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import Plus from 'lucide-svelte/icons/plus';
	import { tick } from 'svelte';
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
	let composerToggle = $state<HTMLElement | null>(null);
	let publishedNotice = $state<HTMLElement | null>(null);

	/** Closes the composer and returns focus to the button that opened it. */
	function closeComposer() {
		isComposerOpen = false;
		composerToggle?.focus();
	}
	let isHistoryEditorOpen = $state(false);
	let savedReviewId = $state<string | null>(null);
	const decimalFormat = new Intl.NumberFormat(getLocale(), {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});
	const percentFormat = new Intl.NumberFormat(getLocale(), { style: 'percent' });
</script>

<!-- Writing sits beside the heading, as Ask a question does, so it spends no row of its own. -->
<div class="flex flex-wrap items-center justify-between gap-3">
	<h2 class="text-xl font-semibold">{m.reviews_heading()}</h2>
	{#if context.ownReviewId && !isComposerOpen}
		<Button
			variant="outlined"
			size="compact"
			class="max-w-full whitespace-normal"
			href={resolve('/(app)/courses/[courseId]/reviews/[postId]', {
				courseId: course.id,
				postId: context.ownReviewId
			})}>{m.reviews_open_or_edit_own()}</Button
		>
	{:else}
		<Button
			bind:ref={composerToggle}
			variant={isComposerOpen ? 'tonal' : 'filled'}
			size="compact"
			class="max-w-full whitespace-normal"
			aria-expanded={isComposerOpen}
			aria-controls="review-composer"
			onclick={() => (isComposerOpen = !isComposerOpen)}
			><Plus size={18} />
			{m.reviews_write()}</Button
		>
	{/if}
</div>
<!-- One line of facts rather than three tiles, so the reviews themselves start sooner. -->
<dl class="mt-2 flex flex-wrap gap-x-5 gap-y-1">
	<div class="flex items-baseline gap-1.5">
		<dt class="text-sm text-on-surface-variant">{m.reviews_statistic_count()}</dt>
		<dd class="font-heading text-lg font-bold">{statistics.reviewCount}</dd>
	</div>
	<div class="flex items-baseline gap-1.5">
		<dt class="text-sm text-on-surface-variant">{m.reviews_statistic_workload()}</dt>
		<dd class="font-heading text-lg font-bold">
			{statistics.averageWorkload === null
				? m.reviews_statistic_not_yet()
				: decimalFormat.format(statistics.averageWorkload)}
			{#if statistics.averageWorkload !== null}<span
					class="text-sm font-medium text-on-surface-variant">/ 5</span
				>{/if}
		</dd>
	</div>
	<div class="flex items-baseline gap-1.5">
		<dt class="text-sm text-on-surface-variant">{m.reviews_statistic_take_again()}</dt>
		<dd class="font-heading text-lg font-bold">
			{statistics.wouldTakeAgainPercentage === null
				? m.reviews_statistic_not_yet()
				: percentFormat.format(statistics.wouldTakeAgainPercentage / 100)}
		</dd>
	</div>
</dl>
<p class="mt-1 text-sm text-on-surface-variant">{m.reviews_statistics_basis()}</p>
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
	<p class="mt-4 text-sm outline-none" role="status" tabindex="-1" bind:this={publishedNotice}>
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

{#if isComposerOpen}
	<!-- Who may review is explained once someone asks to write one, so reviews come first. -->
	<section
		id="review-composer"
		aria-label={m.reviews_write()}
		class="mt-4 rounded-card border bg-surface p-4"
	>
		{#if context.attempts.length === 0}
			<p class="font-semibold">{m.reviews_history_required()}</p>
			<p class="mt-1 text-sm text-on-surface-variant">
				{m.reviews_history_required_detail()}
			</p>
			<Button
				variant="outlined"
				class="mt-3 max-w-full whitespace-normal"
				onclick={() => (isHistoryEditorOpen = true)}>{m.common_add_to_history()}</Button
			>
		{:else}
			<div>
				<ReviewForm
					courseId={course.id}
					attempts={context.attempts}
					onSaved={async (post) => {
						savedReviewId = post.id;
						isComposerOpen = false;
						// The form that had focus is gone, so focus moves to the notice with its link.
						await tick();
						publishedNotice?.focus();
					}}
					onCancel={closeComposer}
				/>
			</div>
		{/if}
	</section>
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
