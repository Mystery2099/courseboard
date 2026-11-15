<script lang="ts">
	import type { PendingReply } from '#lib/client/content/ReplySubmissionQueue.svelte.ts';

	let {
		pendingReply,
		onRetry,
		onDiscard
	}: {
		pendingReply: PendingReply;
		onRetry: () => void;
		onDiscard: () => void;
	} = $props();
</script>

<div class="rounded-2xl border border-dashed p-3">
	<p class="wrap-break-word whitespace-pre-wrap text-slate-600">{pendingReply.bodyMarkdown}</p>
	{#if pendingReply.status === 'sending'}
		<p class="mt-2 text-sm text-slate-600" role="status">Sending…</p>
	{:else}
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
			<p class="text-red-700" role="alert">Not sent. {pendingReply.errorMessage}</p>
			<button type="button" class="rounded-full border px-3 py-1 font-semibold" onclick={onRetry}
				>Retry</button
			>
			<button type="button" class="rounded-full px-3 py-1" onclick={onDiscard}>Discard</button>
		</div>
	{/if}
</div>
