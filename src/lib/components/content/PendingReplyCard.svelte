<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import MarkdownBody from './MarkdownBody.svelte';
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

<div id="pending-reply-{pendingReply.submissionId}" class="rounded-2xl border border-dashed p-3">
	<MarkdownBody
		class="text-on-surface-variant"
		markdown={pendingReply.bodyMarkdown}
		topHeadingLevel={3}
	/>
	{#if pendingReply.status === 'sending'}
		<p class="mt-2 text-sm text-on-surface-variant" role="status">{m.pending_reply_sending()}</p>
	{:else}
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
			<p class="text-error" role="alert">
				{m.pending_reply_not_sent({ reason: pendingReply.errorMessage ?? '' })}
			</p>
			<Button variant="outlined" size="compact" onclick={onRetry}>{m.common_retry()}</Button>
			<Button variant="text" size="compact" onclick={onDiscard}>{m.common_discard()}</Button>
		</div>
	{/if}
</div>
