<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { tick, untrack } from 'svelte';
	import type { ZodError } from 'zod';
	import { ApiRequestError } from '#lib/client/ApiRequest.ts';
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
		const errors: Record<string, string | undefined> = {};
		for (const issue of error.issues) {
			const field = issue.path[0];
			if (typeof field === 'string') errors[field] ??= issue.message;
		}
		fieldErrors = errors;
		if (fieldErrors.disclosureAcknowledged) {
			fieldErrors.disclosureAcknowledged = 'Confirm that you understand what publishing shares.';
		}
		void tick().then(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
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

<form bind:this={formElement} onsubmit={save} novalidate>
	<fieldset class="flex min-w-0 flex-col gap-5" disabled={saveMutation.isPending}>
		<legend class="mb-4 text-lg font-semibold">
			{editedReview ? 'Edit your review' : 'Your experience with this course'}
		</legend>
		{#if editedReview && snapshot}
			<p class="text-sm text-slate-600">
				{HISTORY_STATUS_LABELS[snapshot.status]} · {formatTerm(snapshot.term)} · self-reported.
				Course, status, and term stay fixed.
			</p>
		{:else}
			<label class="flex min-w-0 flex-col gap-1">
				<span class="text-sm font-semibold">Reviewing this attempt</span>
				<select
					class="w-full min-w-0 rounded-2xl border-slate-300 px-4 py-2 text-base"
					bind:value={historyEntryId}
					aria-invalid={fieldErrors.historyEntryId ? 'true' : undefined}
					aria-describedby={fieldErrors.historyEntryId ? 'review-attempt-error' : undefined}
				>
					{#each attempts as attempt (attempt.id)}
						<option value={attempt.id}>
							{HISTORY_STATUS_LABELS[attempt.status]} · {formatTerm(attempt.term)}
						</option>
					{/each}
				</select>
				{#if fieldErrors.historyEntryId}
					<span id="review-attempt-error" class="text-sm text-red-700" role="alert">
						Choose a Taking or Took entry for this course.
					</span>
				{/if}
				<span class="text-sm text-slate-600">Status and term stay fixed after publishing.</span>
			</label>
		{/if}
		<div class="grid gap-5 tablet:grid-cols-2">
			<label class="flex min-w-0 flex-col gap-1">
				<span class="text-sm font-semibold">Workload</span>
				<select
					class="w-full rounded-2xl border-slate-300 px-4 py-2 text-base"
					bind:value={workload}
					aria-invalid={fieldErrors.workload ? 'true' : undefined}
					aria-describedby={fieldErrors.workload ? 'review-workload-error' : undefined}
				>
					<option value="">Choose workload</option>
					<option value={1}>1 / 5 · Very light</option>
					<option value={2}>2 / 5 · Light</option>
					<option value={3}>3 / 5 · Moderate</option>
					<option value={4}>4 / 5 · Heavy</option>
					<option value={5}>5 / 5 · Very heavy</option>
				</select>
				{#if fieldErrors.workload}
					<span id="review-workload-error" class="text-sm text-red-700" role="alert">
						Choose a workload from 1 to 5.
					</span>
				{/if}
			</label>
			<label class="flex min-w-0 flex-col gap-1">
				<span class="text-sm font-semibold">Would you take it again?</span>
				<select
					class="w-full rounded-2xl border-slate-300 px-4 py-2 text-base"
					bind:value={wouldTakeAgain}
					aria-invalid={fieldErrors.wouldTakeAgain ? 'true' : undefined}
					aria-describedby={fieldErrors.wouldTakeAgain ? 'review-take-again-error' : undefined}
				>
					<option value="">Choose an answer</option>
					<option value={true}>Yes</option>
					<option value={false}>No</option>
				</select>
				{#if fieldErrors.wouldTakeAgain}
					<span id="review-take-again-error" class="text-sm text-red-700" role="alert">
						Choose Yes or No.
					</span>
				{/if}
			</label>
		</div>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">Title</span>
			<input
				type="text"
				class="rounded-2xl border-slate-300 px-4 py-2 text-base"
				bind:value={title}
				maxlength={POST_TITLE_MAX_LENGTH}
				aria-invalid={fieldErrors.title ? 'true' : undefined}
				aria-describedby={fieldErrors.title ? 'review-title-error' : undefined}
			/>
			{#if fieldErrors.title}
				<span id="review-title-error" class="text-sm text-red-700" role="alert">
					{fieldErrors.title}
				</span>
			{/if}
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">Your review</span>
			<textarea
				class="min-h-40 rounded-2xl border-slate-300 px-4 py-2 text-base"
				bind:value={bodyMarkdown}
				maxlength={POST_BODY_MAX_LENGTH}
				aria-invalid={fieldErrors.bodyMarkdown ? 'true' : undefined}
				aria-describedby={fieldErrors.bodyMarkdown ? 'review-body-error' : undefined}></textarea>
			{#if fieldErrors.bodyMarkdown}
				<span id="review-body-error" class="text-sm text-red-700" role="alert">
					{fieldErrors.bodyMarkdown}
				</span>
			{/if}
		</label>
		{#if !editedReview && selectedAttempt}
			<div class="border-l-2 border-amber-600 pl-3">
				<p id="review-disclosure" class="text-sm">
					Publishing shares your {HISTORY_STATUS_LABELS[selectedAttempt.status]} status and
					{formatTerm(selectedAttempt.term)} term for this course, even if your history entry is
					private. It stays labeled self-reported. Your history visibility and notes won’t change.
				</p>
				<label class="mt-3 flex min-h-11 items-center gap-2 text-sm">
					<input
						type="checkbox"
						class="rounded border-slate-300"
						bind:checked={disclosureAcknowledged}
						aria-invalid={fieldErrors.disclosureAcknowledged ? 'true' : undefined}
						aria-describedby={fieldErrors.disclosureAcknowledged
							? 'review-disclosure review-disclosure-error'
							: 'review-disclosure'}
					/>
					I understand what publishing shares.
				</label>
				{#if fieldErrors.disclosureAcknowledged}
					<p id="review-disclosure-error" class="mt-1 text-sm text-red-700" role="alert">
						{fieldErrors.disclosureAcknowledged}
					</p>
				{/if}
			</div>
		{/if}
		{#if saveMutation.error}
			<p class="text-sm text-red-700" role="alert">
				{saveMutation.error instanceof ApiRequestError
					? saveMutation.error.message
					: 'Your review could not be saved. Your text is still here. Try again.'}
			</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			<button
				type="submit"
				class="min-h-11 rounded-full bg-blue-700 px-5 py-2 font-semibold text-white disabled:opacity-50"
				disabled={saveMutation.isPending}
				>{saveMutation.isPending ? 'Saving…' : editedReview ? 'Save changes' : 'Publish review'}</button
			>
			<button
				type="button"
				class="min-h-11 rounded-full border px-5 py-2"
				disabled={saveMutation.isPending}
				onclick={onCancel}>Cancel</button
			>
		</div>
	</fieldset>
</form>
