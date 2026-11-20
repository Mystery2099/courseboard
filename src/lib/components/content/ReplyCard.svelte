<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import Check from 'lucide-svelte/icons/check';
	import { describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import type { ReplyAction } from '#lib/client/content/ReplyAction.ts';
	import { longPress } from '#lib/client/gestures/LongPressGesture.ts';
	import type { ReplyResponse } from '#lib/contracts/PostContract.ts';
	import type { ReactionCountResponse, ReactionEmoji } from '#lib/contracts/ReactionContract.ts';
	import ContentByline from './ContentByline.svelte';
	import MarkdownBody from './MarkdownBody.svelte';
	import ReactionBar from './ReactionBar.svelte';
	import ReplyActionMenuButton from './ReplyActionMenuButton.svelte';

	/** Shown as their own buttons on the card too, not only in the menu. */
	const INLINE_ACTION_IDS = new Set(['reply', 'accept-answer']);

	let {
		reply,
		isAccepted,
		actions,
		reactions,
		reactionError,
		copyNotice,
		onToggleReaction,
		onOpenActionSheet
	}: {
		reply: ReplyResponse;
		isAccepted: boolean;
		/** The reply's menu actions; Reply and Accept also appear as buttons. */
		actions: ReplyAction[];
		/** Null on a review thread, which takes no reactions. */
		reactions: ReactionCountResponse[] | null;
		/** Why the last reaction toggle on this reply failed, if it did. */
		reactionError: Error | null;
		copyNotice: string;
		onToggleReaction: (emoji: ReactionEmoji, isAdding: boolean) => void;
		onOpenActionSheet: (opener: HTMLElement) => void;
	} = $props();

	const inlineActions = $derived(actions.filter((action) => INLINE_ACTION_IDS.has(action.id)));
</script>

<!-- A long press stands in for selecting text on phones, and Copy text covers that. -->
<article
	id="reply-{reply.id}"
	tabindex="-1"
	class={[
		'rounded-2xl p-3 pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none] pointer-coarse:[&_a]:[-webkit-touch-callout:default]',
		isAccepted ? 'bg-success-container' : 'bg-surface-container'
	]}
	{@attach longPress((article) => onOpenActionSheet(article))}
>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<ContentByline author={reply.author} createdAt={reply.createdAt} />
		{#if isAccepted}
			<Badge variant="success"><Check size={14} /> {m.thread_accepted_answer()}</Badge>
		{/if}
	</div>
	<MarkdownBody
		class="mt-2"
		markdown={reply.bodyMarkdown}
		mentionedUsernames={reply.mentionedUsernames}
		topHeadingLevel={3}
	/>
	<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
		{#if reactions}
			<ReactionBar {reactions} onToggle={onToggleReaction} />
		{/if}
		{#each inlineActions as action (action.id)}
			<Button
				variant="outlined"
				size="compact"
				disabled={action.disabled}
				onclick={() => {
					action.run();
					action.moveFocus?.();
				}}>{action.label}</Button
			>
		{/each}
		<span role="status" class="text-on-surface-variant">{copyNotice}</span>
		<div class="ml-auto">
			<ReplyActionMenuButton
				label={m.thread_reply_actions({ name: reply.author.displayName })}
				{actions}
				onOpenSheet={onOpenActionSheet}
			/>
		</div>
	</div>
	{#if reactionError}
		<p class="mt-2 text-sm text-error" role="alert">
			{describeRequestFailure(reactionError, m.reaction_failed)}
		</p>
	{/if}
</article>
