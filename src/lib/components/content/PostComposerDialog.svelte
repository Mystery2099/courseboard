<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import EditorDialog from '#lib/components/EditorDialog.svelte';
	import MarkdownFormattingHelp from './MarkdownFormattingHelp.svelte';
	import MentionSuggestions from './MentionSuggestions.svelte';
	import { submitFormOnShortcut } from '#lib/client/hotkeys/FormSubmitShortcut.ts';
	import { formatMarkdownOnShortcut } from '#lib/client/hotkeys/MarkdownFormattingShortcuts.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { describeFieldIssues, describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import {
		ComposerDraftTarget,
		type ComposerDraft,
		type ComposerDraftText
	} from '#lib/client/content/ComposerDrafts.svelte.ts';
	import { getAccountLocalData } from '#lib/client/AccountLocalData.ts';
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
	const composerDrafts = getAccountLocalData().composerDrafts;
	// Closing the dialog keeps the draft; each channel of each course has its own.
	const draft = $derived(composerDrafts.open(ComposerDraftTarget.newPost(courseId, kind)));
	let fieldErrors = $state<{ title?: string; bodyMarkdown?: string }>({});
	let bodyField = $state<HTMLTextAreaElement | null>(null);

	interface PublishRequest {
		request: CreatePostRequest;
		submittedDraft: ComposerDraft;
		submittedText: ComposerDraftText;
	}

	const publishMutation = createMutation(() => ({
		mutationFn: ({ request }: PublishRequest) => PostApiClient.createPost(courseId, request),
		onSuccess: async (post, { submittedDraft, submittedText }) => {
			// The draft that was sent, even if the dialog has since moved to another channel, keeping
			// anything typed while it was publishing.
			submittedDraft.clearIfUnchanged(submittedText);
			await queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(courseId) });
			open = false;
			onCreated(post);
		}
	}));

	const submitLabel = $derived(
		publishMutation.isPending ? m.post_composer_posting() : m.post_composer_post()
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (publishMutation.isPending) return;
		const parsed = createPostSchema.safeParse({
			kind,
			title: draft.title,
			bodyMarkdown: draft.bodyMarkdown
		});
		if (!parsed.success) {
			fieldErrors = describeFieldIssues(parsed.error);
			const form = event.currentTarget as HTMLFormElement;
			void tick().then(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
			return;
		}
		fieldErrors = {};
		publishMutation.mutate({
			request: parsed.data,
			submittedDraft: draft,
			submittedText: { title: draft.title, bodyMarkdown: draft.bodyMarkdown }
		});
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
	<form
		id={formId}
		class="flex flex-col gap-5"
		onsubmit={submit}
		novalidate
		{@attach submitFormOnShortcut}
	>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{m.common_title()}</span>
			<input
				type="text"
				class="min-h-12 rounded-field px-4 py-2 text-base"
				bind:value={draft.title}
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
		<div class="relative">
			<label class="flex flex-col gap-1">
				<span class="text-sm font-semibold">
					{kind === 'question'
						? m.post_composer_question_body()
						: m.post_composer_discussion_body()}
				</span>
				<textarea
					{@attach formatMarkdownOnShortcut}
					bind:this={bodyField}
					class="min-h-48 rounded-field px-4 py-3 text-base"
					bind:value={draft.bodyMarkdown}
					maxlength={POST_BODY_MAX_LENGTH}
					aria-invalid={fieldErrors.bodyMarkdown ? 'true' : undefined}
					aria-describedby={fieldErrors.bodyMarkdown
						? `${formId}-body-help ${formId}-body-error`
						: `${formId}-body-help`}></textarea>
				{#if fieldErrors.bodyMarkdown}
					<span id="{formId}-body-error" class="text-sm text-error" role="alert"
						>{fieldErrors.bodyMarkdown}</span
					>
				{/if}
			</label>
			<MentionSuggestions field={bodyField} />
		</div>
		<MarkdownFormattingHelp id="{formId}-body-help" />
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
