<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery, createMutation, createQuery } from '@tanstack/svelte-query';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { onDestroy, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import Check from 'lucide-svelte/icons/check';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import CircleX from 'lucide-svelte/icons/circle-x';
	import Copy from 'lucide-svelte/icons/copy';
	import Lock from 'lucide-svelte/icons/lock';
	import ReplyIcon from 'lucide-svelte/icons/reply';
	import { describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import { formatReplyCount, groupReplies } from '#lib/client/content/PostPresentation.ts';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import { ReplySubmissionQueue } from '#lib/client/content/ReplySubmissionQueue.svelte.ts';
	import { ComposerDraftTarget } from '#lib/client/content/ComposerDrafts.svelte.ts';
	import { getAccountLocalData } from '#lib/client/AccountLocalData.ts';
	import type { ReplyAction } from '#lib/client/content/ReplyAction.ts';
	import { longPress } from '#lib/client/gestures/LongPressGesture.ts';
	import type {
		PostDetailResponse,
		ReplyListResponse,
		ReplyResponse
	} from '#lib/contracts/PostContract.ts';
	import type { ReactionEmoji, ThreadReactionsResponse } from '#lib/contracts/ReactionContract.ts';
	import { ReactionApiClient, reactionQueryKeys } from '#lib/client/content/ReactionApiClient.ts';
	import {
		applyReactionToggle,
		type ReactionToggle
	} from '#lib/client/content/ReactionPresentation.ts';
	import ReactionBar from './ReactionBar.svelte';
	import ContentByline from './ContentByline.svelte';
	import MarkdownBody from './MarkdownBody.svelte';
	import PendingReplyCard from './PendingReplyCard.svelte';
	import ReplyComposer from './ReplyComposer.svelte';
	import ReplyActionMenuButton from './ReplyActionMenuButton.svelte';
	import ReplyActionSheet from './ReplyActionSheet.svelte';
	import DockedReplyComposer from './DockedReplyComposer.svelte';
	import ThreadKindBadge from './ThreadKindBadge.svelte';
	import ReviewFacts from './ReviewFacts.svelte';
	import ReviewForm from './ReviewForm.svelte';
	import NewActivityNotice from './NewActivityNotice.svelte';
	import { getCourseActivityNotices } from '#lib/client/realtime/CourseActivityNotices.svelte.ts';

	let {
		initialPost,
		initialReplies,
		initialReactions,
		initialLoadedAt
	}: {
		initialPost: PostDetailResponse;
		initialReplies: ReplyListResponse;
		/** Null on a review thread, which takes no reactions. */
		initialReactions: ThreadReactionsResponse | null;
		initialLoadedAt: number;
	} = $props();

	const queryClient = useQueryClient();
	const postId = untrack(() => initialPost.id);
	const courseId = untrack(() => initialPost.courseId);

	const postQuery = createQuery(() => ({
		queryKey: postQueryKeys.detail(postId),
		queryFn: () => PostApiClient.getPost(postId),
		initialData: initialPost,
		initialDataUpdatedAt: initialLoadedAt
	}));
	const post = $derived(postQuery.data);

	const repliesQuery = createInfiniteQuery(() => ({
		queryKey: postQueryKeys.replies(postId),
		queryFn: ({ pageParam }) => PostApiClient.listReplies(postId, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialData: { pages: [initialReplies], pageParams: [null] },
		initialDataUpdatedAt: initialLoadedAt
	}));

	const reactionsQueryKey = reactionQueryKeys.thread(postId);
	const reactionsQuery = createQuery(() => ({
		queryKey: reactionsQueryKey,
		queryFn: () => ReactionApiClient.listThreadReactions(postId),
		initialData: initialReactions ?? undefined,
		initialDataUpdatedAt: initialLoadedAt,
		enabled: initialReactions !== null
	}));
	const reactions = $derived(reactionsQuery.data);

	const reactionMutation = createMutation(() => ({
		mutationFn: ({ replyId, emoji, isAdding }: ReactionToggle) =>
			isAdding
				? ReactionApiClient.addReaction(postId, replyId, emoji)
				: ReactionApiClient.removeReaction(postId, replyId, emoji),
		// Shown at once; a failure undoes only this toggle, so others still in flight stay.
		onMutate: async (toggle: ReactionToggle) => {
			await queryClient.cancelQueries({ queryKey: reactionsQueryKey });
			updateReactions((current) => applyReactionToggle(current, toggle));
		},
		onError: (_error, toggle) =>
			updateReactions((current) =>
				applyReactionToggle(current, { ...toggle, isAdding: !toggle.isAdding })
			),
		onSettled: () => queryClient.invalidateQueries({ queryKey: reactionsQueryKey })
	}));

	function updateReactions(update: (current: ThreadReactionsResponse) => ThreadReactionsResponse) {
		queryClient.setQueryData<ThreadReactionsResponse>(reactionsQueryKey, (current) =>
			current ? update(current) : current
		);
	}

	function toggleReaction(replyId: string | null, emoji: ReactionEmoji, isAdding: boolean) {
		reactionMutation.mutate({ replyId, emoji, isAdding });
	}

	const refreshThread = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) }),
			queryClient.invalidateQueries({ queryKey: postQueryKeys.replies(postId) }),
			queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(courseId) })
		]);
	const accountLocalData = getAccountLocalData();
	const composerDrafts = accountLocalData.composerDrafts;
	const replyDraftTarget = (parentReplyId: string | null) =>
		parentReplyId === null
			? ComposerDraftTarget.threadReply(postId)
			: ComposerDraftTarget.branchReply(postId, parentReplyId);
	// A new queue for each account, so nobody sees or retries replies another account wrote here.
	const unconfirmedReplies = $derived(accountLocalData.unconfirmedReplies(postId));
	const submissionQueue = $derived(
		new ReplySubmissionQueue(postId, unconfirmedReplies, refreshThread, refreshThread)
	);
	// Waits for Clerk to confirm the account, so a session switched in another tab since the page
	// was rendered can't send this account's replies.
	$effect(() => {
		const queue = submissionQueue;
		if (accountLocalData.isConfirmedAccount(unconfirmedReplies.boundAccountId)) {
			untrack(() => queue.restoreUnconfirmed());
		}
	});

	const loadedReplies = $derived(repliesQuery.data.pages.flatMap((page) => page.replies));
	// Replies sent from this page stay visible even when their page of the thread isn't loaded yet.
	const shownReplies = $derived.by(() => {
		const loadedReplyIds = new Set(loadedReplies.map((reply) => reply.id));
		return [
			...loadedReplies,
			...submissionQueue.storedReplies.filter((reply) => !loadedReplyIds.has(reply.id))
		];
	});
	const replyBranches = $derived(groupReplies(shownReplies));

	const courseActivityNotices = getCourseActivityNotices();
	// While older pages are still unloaded, new replies arrive through Load more replies instead.
	const newReplyIds = $derived(
		repliesQuery.hasNextPage
			? []
			: courseActivityNotices.findNewReplyIds(
					postId,
					new Set(shownReplies.map((reply) => reply.id))
				)
	);
	let isShowingNewReplies = $state(false);

	/** Refetches the thread, then moves focus to the first reply shown, since the notice disappears. */
	async function showNewReplies() {
		const announcedReplyIds = new Set(newReplyIds);
		isShowingNewReplies = true;
		try {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) }),
				queryClient.invalidateQueries({ queryKey: postQueryKeys.replies(postId) })
			]);
			// A full last page leaves new replies on the next one.
			const isShown = (replyId: string) => shownReplies.some((reply) => reply.id === replyId);
			while (repliesQuery.hasNextPage && ![...announcedReplyIds].every(isShown)) {
				if ((await repliesQuery.fetchNextPage()).isError) break;
			}
		} finally {
			isShowingNewReplies = false;
		}
		await tick();
		const firstNewReply = shownReplies.find((reply) => announcedReplyIds.has(reply.id));
		if (firstNewReply) document.getElementById(`reply-${firstNewReply.id}`)?.focus();
	}

	function pendingRepliesUnder(parentReplyId: string) {
		return submissionQueue.pendingReplies.filter(
			(pendingReply) => pendingReply.parentReplyId === parentReplyId
		);
	}

	// A reply to a branch that isn't shown, such as one restored before its page of the thread was
	// loaded, appears at thread level, both while pending and once stored, until its branch loads.
	const shownBranchIds = $derived(new Set(replyBranches.map((branch) => branch.reply.id)));
	const isUnderHiddenBranch = (parentReplyId: string | null) =>
		parentReplyId !== null && !shownBranchIds.has(parentReplyId);
	const threadLevelPendingReplies = $derived(
		submissionQueue.pendingReplies.filter(
			(pendingReply) =>
				pendingReply.parentReplyId === null || isUnderHiddenBranch(pendingReply.parentReplyId)
		)
	);
	const storedRepliesUnderHiddenBranches = $derived(
		submissionQueue.storedReplies.filter((reply) => isUnderHiddenBranch(reply.parentReplyId))
	);

	/** A reply being answered. Nested replies are answered in their branch, under the top-level reply. */
	interface ReplyTarget {
		parentReplyId: string;
		authorName: string;
	}
	let replyTarget = $state<ReplyTarget | null>(null);
	// Shared by the phone bar and the desktop composer for the same target, so they show the same text.
	const threadReplyDraft = $derived(composerDrafts.open(replyDraftTarget(null)));
	const branchReplyDraft = $derived(
		replyTarget ? composerDrafts.open(replyDraftTarget(replyTarget.parentReplyId)) : null
	);
	let dockedReplyComposer = $state<ReturnType<typeof DockedReplyComposer> | null>(null);
	let branchReplyComposer = $state<ReturnType<typeof ReplyComposer> | null>(null);

	function setReplyTarget(reply: ReplyResponse) {
		replyTarget = {
			parentReplyId: reply.parentReplyId ?? reply.id,
			authorName: reply.author.displayName
		};
	}

	function startReplyingTo(reply: ReplyResponse) {
		setReplyTarget(reply);
		void focusReplyField();
	}

	/**
	 * Phones answer in the docked composer, focused during the tap so the keyboard opens. On desktop
	 * it is hidden, so focusing it does nothing, and the branch's composer takes focus once mounted.
	 */
	async function focusReplyField() {
		dockedReplyComposer?.focus();
		await tick();
		branchReplyComposer?.focus();
	}

	/** Queues the reply, then brings its pending card into view without moving focus. */
	async function sendReply(bodyMarkdown: string, parentReplyId: string | null) {
		const submissionId = submissionQueue.submit(bodyMarkdown, parentReplyId);
		// A thread-level reply leaves any open reply to someone, and its draft, in place.
		if (parentReplyId !== null) replyTarget = null;
		await tick();
		// Two frames on, once the reply bar has shrunk back to one line and the scroll padding with it.
		requestAnimationFrame(() =>
			requestAnimationFrame(() =>
				document
					.getElementById(`pending-reply-${submissionId}`)
					?.scrollIntoView({ block: 'nearest' })
			)
		);
	}
	let isReviewEditorOpen = $state(false);

	function showUpdatedPost(updatedPost: PostDetailResponse) {
		queryClient.setQueryData(postQueryKeys.detail(postId), updatedPost);
		// The response reflects the post as that request read it; refetch in case another change to
		// the thread landed in between.
		void queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
		void queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(updatedPost.courseId) });
	}

	const acceptedReplyMutation = createMutation(() => ({
		mutationFn: (replyId: string | null) =>
			replyId
				? PostApiClient.chooseAcceptedReply(postId, replyId)
				: PostApiClient.clearAcceptedReply(postId),
		onSuccess: showUpdatedPost
	}));

	const lockMutation = createMutation(() => ({
		mutationFn: (isLocked: boolean) =>
			isLocked ? PostApiClient.lockPost(postId) : PostApiClient.unlockPost(postId),
		onSuccess: showUpdatedPost
	}));

	const actionError = $derived(acceptedReplyMutation.error ?? lockMutation.error);
	const reactionError = $derived(reactionMutation.error);

	let copyNotice = $state<{ replyId: string; message: string } | null>(null);
	let copyNoticeTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyReplyText(reply: ReplyResponse) {
		let message: string;
		try {
			await navigator.clipboard.writeText(reply.bodyMarkdown);
			message = m.thread_reply_text_copied();
		} catch {
			message = m.thread_reply_text_copy_failed();
		}
		clearTimeout(copyNoticeTimer);
		copyNotice = { replyId: reply.id, message };
		copyNoticeTimer = setTimeout(() => (copyNotice = null), 3000);
	}
	onDestroy(() => clearTimeout(copyNoticeTimer));

	function replyActionsFor(reply: ReplyResponse): ReplyAction[] {
		const actions: ReplyAction[] = [];
		// Answers go in the reply's branch, so one whose branch isn't loaded yet can't be answered.
		const canReply = !isUnderHiddenBranch(reply.parentReplyId);
		if (canReply && !post.isLocked) {
			actions.push({
				id: 'reply',
				label: m.common_reply(),
				icon: ReplyIcon,
				run: () => setReplyTarget(reply),
				moveFocus: () => void focusReplyField()
			});
		}
		actions.push({
			id: 'copy-text',
			label: m.thread_copy_reply_text(),
			icon: Copy,
			run: () => void copyReplyText(reply)
		});
		if (post.viewerPermissions.canChooseAcceptedReply) {
			const isAccepted = reply.id === post.acceptedReplyId;
			actions.push({
				id: 'accept-answer',
				label: isAccepted ? m.thread_clear_accepted_answer() : m.thread_accept_answer(),
				icon: isAccepted ? CircleX : CircleCheck,
				disabled: acceptedReplyMutation.isPending,
				run: () => acceptedReplyMutation.mutate(isAccepted ? null : reply.id)
			});
		}
		return actions;
	}

	// Kept after the sheet closes, so its contents stay put while it slides away.
	let actionSheetReply = $state<ReplyResponse | null>(null);
	let actionSheetOpener = $state<HTMLElement | null>(null);
	const isActionSheetOpen = $derived(
		actionSheetReply !== null && page.state.replyActionsReplyId === actionSheetReply.id
	);

	function openReplyActionSheet(reply: ReplyResponse, opener: HTMLElement) {
		// The pending Back would pop the entry this open writes into.
		if (isClosingActionSheet) return;
		actionSheetReply = reply;
		actionSheetOpener = opener;
		// A shallow history entry for the same page, so Back closes the sheet instead of leaving.
		const threadPath = resolve(THREAD_ROUTE_IDS[post.kind], { courseId, postId });
		// Resolved above; the query and fragment stay so the address doesn't change.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${threadPath}${page.url.search}${page.url.hash}`, {
			state: { ...page.state, replyActionsReplyId: reply.id },
			shallow: true,
			replace: page.state.replyActionsReplyId !== undefined
		});
	}

	// A swipe can report the close twice before Back lands, and a second Back would leave the thread.
	let isClosingActionSheet = false;
	$effect(() => {
		if (page.state.replyActionsReplyId === undefined) isClosingActionSheet = false;
	});

	function closeReplyActionSheet() {
		if (!page.state.replyActionsReplyId || isClosingActionSheet) return;
		isClosingActionSheet = true;
		history.back();
	}
</script>

{#snippet replyCard(reply: ReplyResponse, canReply = true)}
	{@const isAccepted = reply.id === post.acceptedReplyId}
	<!-- A long press stands in for selecting text on phones, and Copy text covers that. -->
	<article
		id="reply-{reply.id}"
		tabindex="-1"
		class={[
			'rounded-2xl p-3 pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none] pointer-coarse:[&_a]:[-webkit-touch-callout:default]',
			isAccepted ? 'bg-success-container' : 'bg-surface-container'
		]}
		{@attach longPress((article) => openReplyActionSheet(reply, article))}
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<ContentByline author={reply.author} createdAt={reply.createdAt} />
			{#if isAccepted}
				<Badge variant="success"><Check size={14} /> {m.thread_accepted_answer()}</Badge>
			{/if}
		</div>
		<MarkdownBody class="mt-2" markdown={reply.bodyMarkdown} topHeadingLevel={3} />
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
			{#if reactions}
				<ReactionBar
					reactions={reactions.replies[reply.id] ?? []}
					onToggle={(emoji, isAdding) => toggleReaction(reply.id, emoji, isAdding)}
				/>
			{/if}
			{#if canReply && !post.isLocked}
				<Button variant="outlined" size="compact" onclick={() => startReplyingTo(reply)}
					>{m.common_reply()}</Button
				>
			{/if}
			{#if post.viewerPermissions.canChooseAcceptedReply}
				<Button
					variant="outlined"
					size="compact"
					disabled={acceptedReplyMutation.isPending}
					onclick={() => acceptedReplyMutation.mutate(isAccepted ? null : reply.id)}
					>{isAccepted ? m.thread_clear_accepted_answer() : m.thread_accept_answer()}</Button
				>
			{/if}
			<span role="status" class="text-on-surface-variant"
				>{copyNotice?.replyId === reply.id ? copyNotice.message : ''}</span
			>
			<div class="ml-auto">
				<ReplyActionMenuButton
					label={m.thread_reply_actions({ name: reply.author.displayName })}
					actions={replyActionsFor(reply)}
					onOpenSheet={(opener) => openReplyActionSheet(reply, opener)}
				/>
			</div>
		</div>
	</article>
{/snippet}

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
		topHeadingLevel={2}
	/>
	{#if reactions}
		<div class="mt-3">
			<ReactionBar
				reactions={reactions.post}
				onToggle={(emoji, isAdding) => toggleReaction(null, emoji, isAdding)}
			/>
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
							showUpdatedPost(updatedPost);
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
			disabled={lockMutation.isPending}
			onclick={() => lockMutation.mutate(!post.isLocked)}
			>{post.isLocked ? m.thread_unlock() : m.thread_lock()}</Button
		>
	{/if}
	{#if actionError}
		<p class="mt-2 text-sm text-error" role="alert">
			{describeRequestFailure(actionError, m.thread_action_failed)}
		</p>
	{/if}
</article>

<section class="mt-8" aria-labelledby="replies-heading">
	<h2 id="replies-heading" class="text-lg font-semibold">{formatReplyCount(post.replyCount)}</h2>
	<NewActivityNotice
		label={newReplyIds.length > 0 ? m.realtime_show_new_replies({ count: newReplyIds.length }) : ''}
		isShowing={isShowingNewReplies}
		onShow={showNewReplies}
	/>

	<ul class="mt-3 flex flex-col gap-3">
		{#each replyBranches as branch (branch.reply.id)}
			<li>
				{@render replyCard(branch.reply)}
				<div class="mt-2 ml-4 flex flex-col gap-2 border-l-2 pl-4 empty:hidden">
					{#each branch.nestedReplies as nestedReply (nestedReply.id)}
						{@render replyCard(nestedReply)}
					{/each}
					{#each pendingRepliesUnder(branch.reply.id) as pendingReply (pendingReply.submissionId)}
						<PendingReplyCard
							{pendingReply}
							onRetry={() => submissionQueue.retry(pendingReply.submissionId)}
							onDiscard={() => submissionQueue.discard(pendingReply.submissionId)}
						/>
					{/each}
					{#if replyTarget?.parentReplyId === branch.reply.id && branchReplyDraft && !post.isLocked}
						<div class="hidden desktop:block">
							<ReplyComposer
								bind:this={branchReplyComposer}
								label={m.thread_reply_to({ name: replyTarget.authorName })}
								draft={branchReplyDraft}
								onSubmit={(bodyMarkdown) => sendReply(bodyMarkdown, branch.reply.id)}
								onCancel={() => (replyTarget = null)}
							/>
						</div>
					{/if}
				</div>
			</li>
		{/each}
	</ul>

	{#if repliesQuery.hasNextPage}
		<Button
			variant="outlined"
			size="compact"
			class="mt-3"
			disabled={repliesQuery.isFetchingNextPage}
			onclick={() => repliesQuery.fetchNextPage()}
			>{repliesQuery.isFetchingNextPage ? m.common_loading() : m.thread_load_more_replies()}</Button
		>
	{/if}
	{#if repliesQuery.isFetchNextPageError}
		<p class="mt-2 text-sm text-error" role="alert">{m.thread_replies_load_failed()}</p>
	{/if}

	<div class="mt-3 flex flex-col gap-3 empty:hidden">
		{#each storedRepliesUnderHiddenBranches as reply (reply.id)}
			<!-- Its branch, where answers to it go, isn't loaded yet. -->
			{@render replyCard(reply, false)}
		{/each}
		{#each threadLevelPendingReplies as pendingReply (pendingReply.submissionId)}
			<PendingReplyCard
				{pendingReply}
				onRetry={() => submissionQueue.retry(pendingReply.submissionId)}
				onDiscard={() => submissionQueue.discard(pendingReply.submissionId)}
			/>
		{/each}
	</div>

	{#if post.isLocked}
		<p class="mt-6 rounded-2xl bg-surface-container p-4 text-sm" role="status">
			{m.thread_locked_notice()}
		</p>
	{:else}
		<div class="mt-6 hidden desktop:block">
			<ReplyComposer
				label={m.thread_your_reply()}
				draft={threadReplyDraft}
				onSubmit={(bodyMarkdown) => sendReply(bodyMarkdown, null)}
			/>
		</div>
	{/if}
</section>

{#if !post.isLocked}
	<DockedReplyComposer
		bind:this={dockedReplyComposer}
		replyTargetName={replyTarget?.authorName ?? null}
		draft={branchReplyDraft ?? threadReplyDraft}
		onSubmit={(bodyMarkdown) => sendReply(bodyMarkdown, replyTarget?.parentReplyId ?? null)}
		onClearReplyTarget={() => (replyTarget = null)}
	/>
{/if}

<ReplyActionSheet
	isOpen={isActionSheetOpen}
	opener={actionSheetOpener}
	title={actionSheetReply ? m.thread_reply_by({ name: actionSheetReply.author.displayName }) : ''}
	actions={actionSheetReply ? replyActionsFor(actionSheetReply) : []}
	onClose={closeReplyActionSheet}
/>
