<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { describeValidationIssue } from '#lib/client/ErrorPresentation.ts';
	import { REPLY_BODY_MAX_LENGTH, createReplySchema } from '#lib/contracts/PostContract.ts';

	let {
		label,
		onSubmit,
		onCancel
	}: {
		label: string;
		onSubmit: (bodyMarkdown: string) => void;
		onCancel?: () => void;
	} = $props();

	let bodyMarkdown = $state('');
	let errorMessage = $state<string | null>(null);

	function submit(event?: SubmitEvent) {
		event?.preventDefault();
		const parsed = createReplySchema.shape.bodyMarkdown.safeParse(bodyMarkdown);
		if (!parsed.success) {
			errorMessage = describeValidationIssue(parsed.error.issues[0]);
			return;
		}
		errorMessage = null;
		bodyMarkdown = '';
		onSubmit(parsed.data);
	}
</script>

<form class="flex flex-col gap-2" onsubmit={submit} novalidate>
	<label class="flex flex-col gap-1">
		<span class="text-sm font-semibold">{label}</span>
		<textarea
			class="min-h-24 rounded-2xl border-slate-300 px-4 py-2"
			bind:value={bodyMarkdown}
			maxlength={REPLY_BODY_MAX_LENGTH}
			aria-invalid={errorMessage ? 'true' : undefined}
			onkeydown={(event) => {
				if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
			}}></textarea>
	</label>
	{#if errorMessage}
		<p class="text-sm text-red-700" role="alert">{errorMessage}</p>
	{/if}
	<div class="flex gap-2">
		<button type="submit" class="rounded-full bg-blue-700 px-5 py-2 font-semibold text-white"
			>{m.common_reply()}</button
		>
		{#if onCancel}
			<button type="button" class="rounded-full border px-5 py-2" onclick={onCancel}
				>{m.common_cancel()}</button
			>
		{/if}
	</div>
</form>
