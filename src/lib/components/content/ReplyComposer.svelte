<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { describeValidationIssue } from '#lib/client/ErrorPresentation.ts';
	import { REPLY_BODY_MAX_LENGTH, createReplySchema } from '#lib/contracts/PostContract.ts';
	import { submitFormOnShortcut } from '#lib/client/hotkeys/FormSubmitShortcut.ts';
	import MarkdownFormattingHelp from './MarkdownFormattingHelp.svelte';

	let {
		label,
		onSubmit,
		onCancel
	}: {
		label: string;
		onSubmit: (bodyMarkdown: string) => void;
		onCancel?: () => void;
	} = $props();

	const fieldId = $props.id();
	const helpId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	let bodyMarkdown = $state('');
	let errorMessage = $state<string | null>(null);
	let bodyField = $state<HTMLTextAreaElement | null>(null);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const parsed = createReplySchema.shape.bodyMarkdown.safeParse(bodyMarkdown);
		if (!parsed.success) {
			errorMessage = describeValidationIssue(parsed.error.issues[0]);
			bodyField?.focus();
			return;
		}
		errorMessage = null;
		bodyMarkdown = '';
		onSubmit(parsed.data);
	}
</script>

<form class="flex flex-col gap-2" onsubmit={submit} novalidate {@attach submitFormOnShortcut}>
	<label class="flex flex-col gap-1">
		<span class="text-sm font-semibold">{label}</span>
		<textarea
			bind:this={bodyField}
			class="min-h-24 rounded-field px-4 py-3 text-base"
			bind:value={bodyMarkdown}
			maxlength={REPLY_BODY_MAX_LENGTH}
			aria-invalid={errorMessage ? 'true' : undefined}
			aria-describedby={errorMessage ? `${helpId} ${errorId}` : helpId}></textarea>
	</label>
	<MarkdownFormattingHelp id={helpId} />
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
