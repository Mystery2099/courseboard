<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import EditorDialog from '#lib/components/EditorDialog.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { describeFieldIssues, describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import {
		POST_BODY_MAX_LENGTH,
		POST_TITLE_MAX_LENGTH,
		createPostSchema,
		type CreatePostRequest,
		type PostDetailResponse,
		type ThreadKind
	} from '#lib/contracts/PostContract.ts';

	let {
		open = $bindable(false),
		courseId,
		kind,
		onCreated
	}: {
		open?: boolean;
		courseId: string;
		kind: ThreadKind;
		onCreated: (post: PostDetailResponse) => void;
	} = $props();

	const formId = $props.id();
	const queryClient = useQueryClient();
	let title = $state('');
	let bodyMarkdown = $state('');
	let fieldErrors = $state<{ title?: string; bodyMarkdown?: string }>({});

	const publishMutation = createMutation(() => ({
		mutationFn: (request: CreatePostRequest) => PostApiClient.createPost(courseId, request),
		onSuccess: async (post) => {
			await queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(courseId) });
			title = '';
			bodyMarkdown = '';
			open = false;
			onCreated(post);
		}
	}));

	const submitLabel = $derived(
		publishMutation.isPending ? m.post_composer_posting() : m.post_composer_post()
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const parsed = createPostSchema.safeParse({ kind, title, bodyMarkdown });
		if (!parsed.success) {
			fieldErrors = describeFieldIssues(parsed.error);
			const form = event.currentTarget as HTMLFormElement;
			void tick().then(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
			return;
		}
		fieldErrors = {};
		publishMutation.mutate(parsed.data);
	}
</script>

<EditorDialog
	bind:open
	title={kind === 'question' ? m.post_composer_ask_question() : m.post_composer_start_discussion()}
	description={m.post_composer_description()}
	{formId}
	{submitLabel}
	isSubmitting={publishMutation.isPending}
>
	<form id={formId} class="flex flex-col gap-5" onsubmit={submit} novalidate>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{m.common_title()}</span>
			<input
				type="text"
				class="min-h-12 rounded-field border-outline px-4 py-2 text-base"
				bind:value={title}
				maxlength={POST_TITLE_MAX_LENGTH}
				aria-invalid={fieldErrors.title ? 'true' : undefined}
				aria-describedby={fieldErrors.title ? `${formId}-title-error` : undefined}
			/>
			{#if fieldErrors.title}
				<span id="{formId}-title-error" class="text-sm text-error" role="alert"
					>{fieldErrors.title}</span
				>
			{/if}
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">
				{kind === 'question' ? m.post_composer_question_body() : m.post_composer_discussion_body()}
			</span>
			<textarea
				class="min-h-48 rounded-field border-outline px-4 py-3 text-base"
				bind:value={bodyMarkdown}
				maxlength={POST_BODY_MAX_LENGTH}
				aria-invalid={fieldErrors.bodyMarkdown ? 'true' : undefined}
				aria-describedby={fieldErrors.bodyMarkdown ? `${formId}-body-error` : undefined}></textarea>
			{#if fieldErrors.bodyMarkdown}
				<span id="{formId}-body-error" class="text-sm text-error" role="alert"
					>{fieldErrors.bodyMarkdown}</span
				>
			{/if}
		</label>
		{#if publishMutation.error}
			<p class="text-sm text-error" role="alert">
				{describeRequestFailure(publishMutation.error, m.post_composer_publish_failed)}
			</p>
		{/if}
		<!-- On phones the header carries Post, and the close button cancels. -->
		<div class="flex gap-2 max-tablet:hidden">
			<Button variant="filled" type="submit" disabled={publishMutation.isPending}
				>{submitLabel}</Button
			>
			<Button variant="outlined" onclick={() => (open = false)}>{m.common_cancel()}</Button>
		</div>
	</form>
</EditorDialog>
