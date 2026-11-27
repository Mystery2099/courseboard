<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import CornerLeftUp from 'lucide-svelte/icons/corner-left-up';
	import Star from 'lucide-svelte/icons/star';
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
		isLinked,
		actions,
		reactions,
		reactionError,
		copyNotice,
		parentReplyAuthorName = null,
		onToggleReaction,
		onOpenActionSheet,
		onShowParentReply
	}: {
		reply: ReplyResponse;
		isAccepted: boolean;
		/** The reply the address links to, marked so the reader finds it. */
		isLinked: boolean;
		/** The reply's menu actions; Reply and Accept also appear as buttons. */
		actions: ReplyAction[];
		/** Null on a review thread, which takes no reactions. */
		reactions: ReactionCountResponse[] | null;
		/** Why the last reaction toggle on this reply failed, if it did. */
		reactionError: Error | null;
		copyNotice: string;
		/** On a nested reply, who wrote the reply its branch answers, which it links back to. */
		parentReplyAuthorName?: string | null;
		onToggleReaction: (emoji: ReactionEmoji, isAdding: boolean) => void;
		onOpenActionSheet: (opener: HTMLElement) => void;
		onShowParentReply?: () => void;
	} = $props();

	const inlineActions = $derived(actions.filter((action) => INLINE_ACTION_IDS.has(action.id)));
</script>

<!-- A long press stands in for selecting text on phones, and Copy text covers that. -->
<article
	id="reply-{reply.id}"
	tabindex="-1"
	class={[
		'rounded-2xl p-3 pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none] pointer-coarse:[&_a]:[-webkit-touch-callout:default]',
		// Replies read as a chat timeline; only the accepted answer gets a tinted panel.
		isAccepted && 'bg-success-container',
		isLinked && 'ring-2 ring-primary'
	]}
	{@attach longPress((article) => onOpenActionSheet(article))}
>
	{#if parentReplyAuthorName && onShowParentReply}
		<Button
			variant="text"
			size="compact"
			class="-ms-2 -mt-1 mb-1 max-w-full px-2"
			onclick={onShowParentReply}
			><CornerLeftUp aria-hidden="true" /><span class="truncate"
				>{m.thread_in_reply_to({ name: parentReplyAuthorName })}</span
			></Button
		>
	{/if}
	<!--
		From tablet up the actions share the byline's row, so a short reply spends no row on them. Phones
		keep them under the text, where a thumb expects them.
	-->
	<div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
		<div class="flex flex-wrap items-center gap-2">
			<ContentByline author={reply.author} createdAt={reply.createdAt} />
			{#if isAccepted}
				<Badge variant="success"
					><Star size={14} class="fill-gold stroke-on-success-container" />
					{m.thread_accepted_answer()}</Badge
				>
			{/if}
		</div>
		<MarkdownBody
			class="col-span-2 row-start-2 mt-2 tablet:mt-1"
			markdown={reply.bodyMarkdown}
			mentionedUsernames={reply.mentionedUsernames}
			topHeadingLevel={3}
		/>
		<div
			class="col-span-2 row-start-3 mt-2 flex flex-wrap items-center gap-2 text-sm tablet:col-span-1 tablet:col-start-2 tablet:row-start-1 tablet:mt-0 tablet:justify-end"
		>
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
	</div>
	{#if reactionError}
		<p class="mt-2 text-sm text-error" role="alert">
			{describeRequestFailure(reactionError, m.reaction_failed)}
		</p>
	{/if}
</article>
