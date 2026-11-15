<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
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
	<p class="wrap-break-word whitespace-pre-wrap text-on-surface-variant">
		{pendingReply.bodyMarkdown}
	</p>
	{#if pendingReply.status === 'sending'}
		<p class="mt-2 text-sm text-on-surface-variant" role="status">{m.pending_reply_sending()}</p>
	{:else}
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
			<p class="text-error" role="alert">
				{m.pending_reply_not_sent({ reason: pendingReply.errorMessage ?? '' })}
			</p>
			<button type="button" class="rounded-full border px-3 py-1 font-semibold" onclick={onRetry}
				>{m.common_retry()}</button
			>
			<button type="button" class="rounded-full px-3 py-1" onclick={onDiscard}
				>{m.common_discard()}</button
			>
		</div>
	{/if}
</div>
