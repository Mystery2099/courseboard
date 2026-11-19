<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import CaseSensitive from 'lucide-svelte/icons/case-sensitive';
	import CornerUpLeft from 'lucide-svelte/icons/corner-up-left';
	import X from 'lucide-svelte/icons/x';
	import { describeValidationIssue } from '#lib/client/ErrorPresentation.ts';
	import { REPLY_BODY_MAX_LENGTH, createReplySchema } from '#lib/contracts/PostContract.ts';
	import { submitFormOnShortcut } from '#lib/client/hotkeys/FormSubmitShortcut.ts';
	import { formatMarkdownOnShortcut } from '#lib/client/hotkeys/MarkdownFormattingShortcuts.ts';
	import { stayAboveOnScreenKeyboard } from '#lib/client/navigation/OnScreenKeyboardInset.ts';
	import { getPhoneDock } from '#lib/client/navigation/PhoneDock.svelte.ts';

	const MAXIMUM_FIELD_HEIGHT_PX = 128;

	let {
		replyTargetName,
		onSubmit,
		onClearReplyTarget
	}: {
		/** Whose reply is being answered, or null for a reply to the thread itself. */
		replyTargetName: string | null;
		onSubmit: (bodyMarkdown: string) => void;
		onClearReplyTarget: () => void;
	} = $props();

	const fieldId = $props.id();
	const helpId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	let bodyMarkdown = $state('');
	let errorMessage = $state<string | null>(null);
	let isFormattingHelpOpen = $state(false);
	let bodyField = $state<HTMLTextAreaElement | null>(null);
	let barHeight = $state(64);
	const fieldLabel = $derived(
		replyTargetName ? m.thread_reply_to({ name: replyTargetName }) : m.thread_your_reply()
	);

	const phoneDock = getPhoneDock();
	$effect(() => phoneDock.replaceWithReplyBar());

	/** Focuses the field. Called from a tap, so phones open the keyboard right away. */
	export function focus() {
		bodyField?.focus();
	}

	// Grows with each line typed, like a messaging app, until it scrolls inside its own frame.
	$effect(() => {
		void bodyMarkdown;
		if (!bodyField) return;
		bodyField.style.height = 'auto';
		bodyField.style.height = `${Math.min(bodyField.scrollHeight, MAXIMUM_FIELD_HEIGHT_PX)}px`;
		bodyField.style.overflowY =
			bodyField.scrollHeight > MAXIMUM_FIELD_HEIGHT_PX ? 'auto' : 'hidden';
	});

	// Scrolling stops short of the bar, whatever its height, instead of the dock's.
	$effect(() => {
		const root = document.documentElement;
		root.style.setProperty('--docked-reply-composer-height', `${barHeight + 16}px`);
		return () => root.style.removeProperty('--docked-reply-composer-height');
	});

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
		// Sent from the keyboard, Send keeps focus; return it to the field, as a tap would leave it.
		if (document.activeElement !== bodyField && bodyField?.form?.contains(document.activeElement)) {
			bodyField.focus();
		}
	}

	function clearReplyTarget() {
		onClearReplyTarget();
		bodyField?.focus();
	}

	/** Keeps focus, and so the keyboard, on the field when a bar button is tapped. */
	function keepFieldFocused(event: MouseEvent) {
		if (document.activeElement === bodyField) event.preventDefault();
	}
</script>

<!--
	Phones only: pinned to the bottom in place of the dock, as in messaging apps. The spacer keeps the
	end of the thread scrollable above the bar as the bar grows.
-->
<div class="desktop:hidden">
	<div
		aria-hidden="true"
		class="mt-6"
		style:height="calc({barHeight}px + var(--keyboard-inset, 0px))"
	></div>
	<form
		bind:offsetHeight={barHeight}
		class="fixed inset-x-0 bottom-[var(--keyboard-inset,0px)] z-30 border-t bg-surface px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] data-keyboard-open:pb-2"
		aria-label={fieldLabel}
		onsubmit={submit}
		novalidate
		{@attach submitFormOnShortcut}
		{@attach stayAboveOnScreenKeyboard}
	>
		<div class="mx-auto max-w-3xl">
			<div
				class={[
					'mb-1 flex items-center gap-2 ps-2 text-sm text-on-surface-variant',
					!replyTargetName && 'hidden'
				]}
			>
				<CornerUpLeft size={16} aria-hidden="true" class="shrink-0" />
				<span class="min-w-0 truncate" aria-live="polite"
					>{replyTargetName ? m.thread_replying_to({ name: replyTargetName }) : ''}</span
				>
				<Button
					variant="ghost"
					size="icon"
					class="ms-auto"
					aria-label={replyTargetName ? m.thread_stop_replying_to({ name: replyTargetName }) : ''}
					onmousedown={keepFieldFocused}
					onclick={clearReplyTarget}><X size={18} /></Button
				>
			</div>
			<p
				id={helpId}
				hidden={!isFormattingHelpOpen}
				class="mb-2 px-2 text-sm text-on-surface-variant"
			>
				{m.markdown_formatting_help()}
			</p>
			{#if errorMessage}
				<p id={errorId} class="mb-2 px-2 text-sm text-error" role="alert">{errorMessage}</p>
			{/if}
			<div class="flex items-end gap-1">
				<Button
					variant="ghost"
					size="icon"
					aria-label={m.markdown_formatting_help_toggle()}
					aria-expanded={isFormattingHelpOpen}
					aria-controls={helpId}
					onmousedown={keepFieldFocused}
					onclick={() => (isFormattingHelpOpen = !isFormattingHelpOpen)}
					><CaseSensitive size={22} /></Button
				>
				<label for={fieldId} class="sr-only">{fieldLabel}</label>
				<textarea
					{@attach formatMarkdownOnShortcut}
					id={fieldId}
					bind:this={bodyField}
					bind:value={bodyMarkdown}
					rows="1"
					placeholder={m.thread_reply_placeholder()}
					class="min-h-11 flex-1 resize-none rounded-[22px] bg-surface-container px-4 py-2.5 text-base"
					maxlength={REPLY_BODY_MAX_LENGTH}
					aria-invalid={errorMessage ? 'true' : undefined}
					aria-describedby={[isFormattingHelpOpen && helpId, errorMessage && errorId]
						.filter(Boolean)
						.join(' ') || undefined}></textarea>
				<Button
					variant="filled"
					size="icon"
					type="submit"
					aria-label={m.thread_send_reply()}
					onmousedown={keepFieldFocused}><ArrowUp size={22} /></Button
				>
			</div>
		</div>
	</form>
</div>
