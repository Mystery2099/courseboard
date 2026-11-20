<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Lock from 'lucide-svelte/icons/lock';
	import { describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import type { PostDetailResponse } from '#lib/contracts/PostContract.ts';
	import type { ReactionCountResponse, ReactionEmoji } from '#lib/contracts/ReactionContract.ts';
	import ContentByline from './ContentByline.svelte';
	import MarkdownBody from './MarkdownBody.svelte';
	import ReactionBar from './ReactionBar.svelte';
	import ReviewFacts from './ReviewFacts.svelte';
	import ReviewForm from './ReviewForm.svelte';
	import ThreadKindBadge from './ThreadKindBadge.svelte';

	let {
		post,
		reactions,
		reactionError,
		isLockPending,
		actionError,
		onToggleReaction,
		onToggleLock,
		onReviewSaved
	}: {
		post: PostDetailResponse;
		/** Null on a review thread, which takes no reactions. */
		reactions: ReactionCountResponse[] | null;
		/** Why the last reaction toggle on the post failed, if it did. */
		reactionError: Error | null;
		isLockPending: boolean;
		/** A failed lock or accepted-answer change. */
		actionError: Error | null;
		onToggleReaction: (emoji: ReactionEmoji, isAdding: boolean) => void;
		onToggleLock: () => void;
		onReviewSaved: (updatedPost: PostDetailResponse) => void;
	} = $props();

	let isReviewEditorOpen = $state(false);
</script>

<article>
	<div class="flex flex-wrap items-center gap-2">
		<ThreadKindBadge kind={post.kind} />
		{#if post.isLocked}
			<Badge variant="neutral"><Lock size={14} /> {m.post_badge_locked()}</Badge>
		{/if}
	</div>
	<!-- The thread is the page's subject, so its title is the page heading. -->
	<h1 class="mt-2 text-2xl leading-tight font-bold wrap-break-word desktop:text-headline">
		{post.title}
	</h1>
	<div class="mt-2"><ContentByline author={post.author} createdAt={post.createdAt} /></div>
	{#if post.editedAt}
		<p class="mt-1 text-sm text-on-surface-variant">
			<time datetime={post.editedAt}
				>{m.thread_edited({
					date: new Date(post.editedAt).toLocaleDateString(getLocale())
				})}</time
			>
		</p>
	{/if}
	{#if post.reviewData}
		<ReviewFacts review={post.reviewData} />
	{/if}
	<MarkdownBody
		class="mt-4 font-reading text-[17px] leading-[1.65] text-body desktop:text-lg desktop:leading-[1.7]"
		markdown={post.bodyMarkdown}
		mentionedUsernames={post.mentionedUsernames}
		topHeadingLevel={2}
	/>
	{#if reactions}
		<div class="mt-3">
			<ReactionBar {reactions} onToggle={onToggleReaction} />
		</div>
	{/if}
	{#if reactionError}
		<p class="mt-2 text-sm text-error" role="alert">
			{describeRequestFailure(reactionError, m.reaction_failed)}
		</p>
	{/if}
	{#if post.viewerPermissions.canEditReview}
		<details bind:open={isReviewEditorOpen} class="group/disclosure mt-4 rounded-card border p-4">
			<summary
				class="-mx-3 flex min-h-11 items-center rounded-full state-layer-primary px-3 font-semibold text-primary transition-colors duration-150"
				>{m.thread_edit_review()}
				<ChevronDown
					size={20}
					class="ml-auto shrink-0 transition-transform duration-150 group-open/disclosure:rotate-180"
					aria-hidden="true"
				/></summary
			>
			{#if isReviewEditorOpen}
				<div class="mt-4">
					<ReviewForm
						courseId={post.courseId}
						editedReview={post}
						onSaved={(updatedPost) => {
							onReviewSaved(updatedPost);
							isReviewEditorOpen = false;
						}}
						onCancel={() => (isReviewEditorOpen = false)}
					/>
				</div>
			{/if}
		</details>
	{/if}
	{#if post.viewerPermissions.canLock}
		<Button
			variant="outlined"
			size="compact"
			class="mt-4"
			disabled={isLockPending}
			onclick={onToggleLock}>{post.isLocked ? m.thread_unlock() : m.thread_lock()}</Button
		>
	{/if}
	{#if actionError}
		<p class="mt-2 text-sm text-error" role="alert">
			{describeRequestFailure(actionError, m.thread_action_failed)}
		</p>
	{/if}
</article>
