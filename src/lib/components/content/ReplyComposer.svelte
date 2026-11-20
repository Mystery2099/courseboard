<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { REPLY_BODY_MAX_LENGTH } from '#lib/contracts/PostContract.ts';
	import { submitFormOnShortcut } from '#lib/client/hotkeys/FormSubmitShortcut.ts';
	import { formatMarkdownOnShortcut } from '#lib/client/hotkeys/MarkdownFormattingShortcuts.ts';
	import type { ComposerDraft } from '#lib/client/content/ComposerDrafts.svelte.ts';
	import { takeReplyBody } from '#lib/client/content/ReplyBodySubmission.ts';
	import MarkdownFormattingHelp from './MarkdownFormattingHelp.svelte';
	import MentionSuggestions from './MentionSuggestions.svelte';

	let {
		label,
		draft,
		onSubmit,
		onCancel
	}: {
		label: string;
		draft: ComposerDraft;
		onSubmit: (bodyMarkdown: string) => void;
		onCancel?: () => void;
	} = $props();

	const fieldId = $props.id();
	const helpId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	let errorMessage = $state<string | null>(null);
	let bodyField = $state<HTMLTextAreaElement | null>(null);

	export function focus() {
		bodyField?.focus();
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const submission = takeReplyBody(draft);
		if (!submission.isValid) {
			errorMessage = submission.errorMessage;
			bodyField?.focus();
			return;
		}
		errorMessage = null;
		onSubmit(submission.bodyMarkdown);
	}
</script>

<form class="flex flex-col gap-2" onsubmit={submit} novalidate {@attach submitFormOnShortcut}>
	<div class="relative">
		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{label}</span>
			<textarea
				{@attach formatMarkdownOnShortcut}
				bind:this={bodyField}
				class="min-h-24 rounded-field px-4 py-3 text-base"
				bind:value={draft.bodyMarkdown}
				maxlength={REPLY_BODY_MAX_LENGTH}
				aria-invalid={errorMessage ? 'true' : undefined}
				aria-describedby={errorMessage ? `${helpId} ${errorId}` : helpId}></textarea>
		</label>
		<MentionSuggestions field={bodyField} />
	</div>
	<MarkdownFormattingHelp id={helpId} allowsMentions />
	{#if errorMessage}
		<p id={errorId} class="text-sm text-error" role="alert">{errorMessage}</p>
	{/if}
	<div class="flex gap-2">
		<Button variant="filled" type="submit">{m.common_reply()}</Button>
		{#if onCancel}
			<Button variant="outlined" onclick={onCancel}>{m.common_cancel()}</Button>
		{/if}
	</div>
</form>
