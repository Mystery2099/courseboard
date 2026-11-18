<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { tick, untrack } from 'svelte';
	import type { ZodError } from 'zod';
	import { describeFieldIssues, describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import { postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import { ReviewApiClient, reviewQueryKeys } from '#lib/client/content/ReviewApiClient.ts';
	import {
		formatTerm,
		HISTORY_STATUS_LABELS
	} from '#lib/client/history/AcademicHistoryPresentation.ts';
	import {
		POST_BODY_MAX_LENGTH,
		POST_TITLE_MAX_LENGTH,
		type PostDetailResponse
	} from '#lib/contracts/PostContract.ts';
	import {
		createReviewSchema,
		updateReviewSchema,
		type CreateReviewRequest,
		type ReviewAttemptResponse,
		type UpdateReviewRequest
	} from '#lib/contracts/ReviewContract.ts';
	import MarkdownFormattingHelp from './MarkdownFormattingHelp.svelte';
	import { submitFormOnShortcut } from '#lib/client/hotkeys/FormSubmitShortcut.ts';
	import { formatMarkdownOnShortcut } from '#lib/client/hotkeys/MarkdownFormattingShortcuts.ts';

	let {
		courseId,
		attempts = [],
		editedReview = null,
		onSaved,
		onCancel
	}: {
		courseId: string;
		attempts?: ReviewAttemptResponse[];
		editedReview?: PostDetailResponse | null;
		onSaved: (post: PostDetailResponse) => void;
		onCancel: () => void;
	} = $props();

	type ReviewSubmission =
		| { kind: 'create'; request: CreateReviewRequest }
		| { kind: 'update'; postId: string; request: UpdateReviewRequest };

	const queryClient = useQueryClient();
	const initial = untrack(() => {
		const workload: number | '' = editedReview?.reviewData?.workload ?? '';
		const wouldTakeAgain: boolean | '' = editedReview?.reviewData?.wouldTakeAgain ?? '';
		return {
			title: editedReview?.title ?? '',
			bodyMarkdown: editedReview?.bodyMarkdown ?? '',
			workload,
			wouldTakeAgain,
			historyEntryId: attempts[0]?.id ?? ''
		};
	});
	let title = $state(initial.title);
	let bodyMarkdown = $state(initial.bodyMarkdown);
	let workload = $state<number | ''>(initial.workload);
	let wouldTakeAgain = $state<boolean | ''>(initial.wouldTakeAgain);
	let historyEntryId = $state(initial.historyEntryId);
	let disclosureAcknowledged = $state(false);
	let fieldErrors = $state<Record<string, string | undefined>>({});
	let formElement: HTMLFormElement;
	const selectedAttempt = $derived(attempts.find((attempt) => attempt.id === historyEntryId));
	const snapshot = $derived(editedReview?.reviewData ?? selectedAttempt);
	const acknowledgedSnapshotKey = $derived(
		selectedAttempt
			? `${selectedAttempt.id}:${selectedAttempt.status}:${selectedAttempt.term.season}:${selectedAttempt.term.year}`
			: ''
	);

	// The acknowledgement covers one entry's status and term; history may change while this is open.
	$effect(() => {
		void acknowledgedSnapshotKey;
		disclosureAcknowledged = false;
	});

	$effect(() => {
		if (editedReview || selectedAttempt) return;
		historyEntryId = attempts[0]?.id ?? '';
	});

	const saveMutation = createMutation(() => ({
		mutationFn: (submission: ReviewSubmission) =>
			submission.kind === 'create'
				? ReviewApiClient.createReview(courseId, submission.request)
				: ReviewApiClient.updateReview(submission.postId, submission.request),
		onSuccess: async (post) => {
			queryClient.setQueryData(postQueryKeys.detail(post.id), post);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(courseId) }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.context(courseId) })
			]);
			onSaved(post);
		},
		onError: () => {
			// Eligibility or an existing review may have changed in another tab. Keep the written text.
			void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.context(courseId) });
		}
	}));

	function showValidationErrors(error: ZodError) {
		fieldErrors = describeFieldIssues(error);
		if (fieldErrors.disclosureAcknowledged) {
			fieldErrors.disclosureAcknowledged = m.review_form_disclosure_required();
		}
		void tick().then(() =>
			formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
		);
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (saveMutation.isPending) return;
		const changes = { title, bodyMarkdown, workload, wouldTakeAgain };
		if (editedReview) {
			const parsed = updateReviewSchema.safeParse(changes);
			if (!parsed.success) {
				showValidationErrors(parsed.error);
				return;
			}
			fieldErrors = {};
			saveMutation.mutate({ kind: 'update', postId: editedReview.id, request: parsed.data });
		} else {
			const parsed = createReviewSchema.safeParse({
				...changes,
				historyEntryId,
				acknowledgedStatus: selectedAttempt?.status,
				acknowledgedTerm: selectedAttempt?.term,
				disclosureAcknowledged
			});
			if (!parsed.success) {
				showValidationErrors(parsed.error);
				return;
			}
			fieldErrors = {};
			saveMutation.mutate({ kind: 'create', request: parsed.data });
		}
	}
</script>

<form bind:this={formElement} onsubmit={save} novalidate {@attach submitFormOnShortcut}>
	<fieldset class="flex min-w-0 flex-col gap-5" disabled={saveMutation.isPending}>
		<legend class="mb-4 text-lg font-semibold">
			{editedReview ? m.review_form_edit_legend() : m.review_form_create_legend()}
		</legend>
		{#if editedReview && snapshot}
			<p class="text-sm text-on-surface-variant">
				{m.review_form_fixed_snapshot({
					status: HISTORY_STATUS_LABELS[snapshot.status](),
					term: formatTerm(snapshot.term)
				})}
			</p>
		{:else}
			<label class="flex min-w-0 flex-col gap-1">
				<span class="text-sm font-semibold">{m.review_form_attempt()}</span>
				<select
					class="min-h-12 w-full min-w-0 rounded-field px-4 py-2 text-base"
					bind:value={historyEntryId}
					aria-invalid={fieldErrors.historyEntryId ? 'true' : undefined}
					aria-describedby={fieldErrors.historyEntryId ? 'review-attempt-error' : undefined}
				>
					{#each attempts as attempt (attempt.id)}
						<option value={attempt.id}>
							{HISTORY_STATUS_LABELS[attempt.status]()} · {formatTerm(attempt.term)}
						</option>
					{/each}
				</select>
				{#if fieldErrors.historyEntryId}
					<span id="review-attempt-error" class="text-sm text-error" role="alert">
						{m.review_form_attempt_required()}
					</span>
				{/if}
				<span class="text-sm text-on-surface-variant">{m.review_form_attempt_fixed()}</span>
			</label>
		{/if}
		<div class="grid gap-5 tablet:grid-cols-2">
			<label class="flex min-w-0 flex-col gap-1">
				<span class="text-sm font-semibold">{m.review_facts_workload()}</span>
				<select
					class="min-h-12 w-full rounded-field px-4 py-2 text-base"
					bind:value={workload}
					aria-invalid={fieldErrors.workload ? 'true' : undefined}
					aria-describedby={fieldErrors.workload ? 'review-workload-error' : undefined}
				>
					<option value="">{m.review_form_workload_placeholder()}</option>
					<option value={1}>{m.review_form_workload_1()}</option>
					<option value={2}>{m.review_form_workload_2()}</option>
					<option value={3}>{m.review_form_workload_3()}</option>
					<option value={4}>{m.review_form_workload_4()}</option>
					<option value={5}>{m.review_form_workload_5()}</option>
				</select>
				{#if fieldErrors.workload}
					<span id="review-workload-error" class="text-sm text-error" role="alert">
						{m.review_form_workload_required()}
					</span>
				{/if}
			</label>
			<label class="flex min-w-0 flex-col gap-1">
				<span class="text-sm font-semibold">{m.review_form_take_again()}</span>
				<select
					class="min-h-12 w-full rounded-field px-4 py-2 text-base"
					bind:value={wouldTakeAgain}
					aria-invalid={fieldErrors.wouldTakeAgain ? 'true' : undefined}
					aria-describedby={fieldErrors.wouldTakeAgain ? 'review-take-again-error' : undefined}
				>
					<option value="">{m.review_form_take_again_placeholder()}</option>
					<option value={true}>{m.common_yes()}</option>
					<option value={false}>{m.common_no()}</option>
				</select>
				{#if fieldErrors.wouldTakeAgain}
					<span id="review-take-again-error" class="text-sm text-error" role="alert">
						{m.review_form_take_again_required()}
					</span>
				{/if}
			</label>
		</div>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{m.common_title()}</span>
			<input
				type="text"
				class="min-h-12 rounded-field px-4 py-2 text-base"
				bind:value={title}
				maxlength={POST_TITLE_MAX_LENGTH}
				aria-invalid={fieldErrors.title ? 'true' : undefined}
				aria-describedby={fieldErrors.title ? 'review-title-error' : undefined}
			/>
			{#if fieldErrors.title}
				<span id="review-title-error" class="text-sm text-error" role="alert">
					{fieldErrors.title}
				</span>
			{/if}
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{m.review_form_body()}</span>
			<textarea
				{@attach formatMarkdownOnShortcut}
				class="min-h-40 rounded-field px-4 py-2 text-base"
				bind:value={bodyMarkdown}
				maxlength={POST_BODY_MAX_LENGTH}
				aria-invalid={fieldErrors.bodyMarkdown ? 'true' : undefined}
				aria-describedby={fieldErrors.bodyMarkdown
					? 'review-body-help review-body-error'
					: 'review-body-help'}></textarea>
			{#if fieldErrors.bodyMarkdown}
				<span id="review-body-error" class="text-sm text-error" role="alert">
					{fieldErrors.bodyMarkdown}
				</span>
			{/if}
		</label>
		<MarkdownFormattingHelp id="review-body-help" />
		{#if !editedReview && selectedAttempt}
			<div class="border-l-2 border-on-warning-container pl-3">
				<p id="review-disclosure" class="text-sm">
					{m.review_form_disclosure({
						status: HISTORY_STATUS_LABELS[selectedAttempt.status](),
						term: formatTerm(selectedAttempt.term)
					})}
				</p>
				<label class="mt-3 flex min-h-11 items-center gap-2 text-sm">
					<input
						type="checkbox"
						class="rounded border-outline"
						bind:checked={disclosureAcknowledged}
						aria-invalid={fieldErrors.disclosureAcknowledged ? 'true' : undefined}
						aria-describedby={fieldErrors.disclosureAcknowledged
							? 'review-disclosure review-disclosure-error'
							: 'review-disclosure'}
					/>
					{m.review_form_disclosure_acknowledgement()}
				</label>
				{#if fieldErrors.disclosureAcknowledged}
					<p id="review-disclosure-error" class="mt-1 text-sm text-error" role="alert">
						{fieldErrors.disclosureAcknowledged}
					</p>
				{/if}
			</div>
		{/if}
		{#if saveMutation.error}
			<p class="text-sm text-error" role="alert">
				{describeRequestFailure(saveMutation.error, m.review_form_save_failed)}
			</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			<Button variant="filled" type="submit" disabled={saveMutation.isPending}
				>{saveMutation.isPending
					? m.common_saving()
					: editedReview
						? m.common_save_changes()
						: m.review_form_publish()}</Button
			>
			<Button variant="outlined" disabled={saveMutation.isPending} onclick={onCancel}
				>{m.common_cancel()}</Button
			>
		</div>
	</fieldset>
</form>
