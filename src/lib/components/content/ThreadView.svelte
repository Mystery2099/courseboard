<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery, createMutation, createQuery } from '@tanstack/svelte-query';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { untrack } from 'svelte';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import Check from 'lucide-svelte/icons/check';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Lock from 'lucide-svelte/icons/lock';
	import { describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import { formatReplyCount, groupReplies } from '#lib/client/content/PostPresentation.ts';
	import { ReplySubmissionQueue } from '#lib/client/content/ReplySubmissionQueue.svelte.ts';
	import type {
		PostDetailResponse,
		ReplyListResponse,
		ReplyResponse
	} from '#lib/contracts/PostContract.ts';
	import ContentByline from './ContentByline.svelte';
	import PendingReplyCard from './PendingReplyCard.svelte';
	import ReplyComposer from './ReplyComposer.svelte';
	import ThreadKindBadge from './ThreadKindBadge.svelte';
	import ReviewFacts from './ReviewFacts.svelte';
	import ReviewForm from './ReviewForm.svelte';

	let {
		initialPost,
		initialReplies,
		initialLoadedAt
	}: {
		initialPost: PostDetailResponse;
		initialReplies: ReplyListResponse;
		initialLoadedAt: number;
	} = $props();

	const queryClient = useQueryClient();
	const postId = untrack(() => initialPost.id);

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

	const refreshThread = () => queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
	const submissionQueue = new ReplySubmissionQueue(postId, refreshThread, refreshThread);

	// Replies sent from this page stay visible even when their page of the thread isn't loaded yet.
	const replyBranches = $derived.by(() => {
		const loadedReplies = repliesQuery.data.pages.flatMap((page) => page.replies);
		const loadedReplyIds = new Set(loadedReplies.map((reply) => reply.id));
		return groupReplies([
			...loadedReplies,
			...submissionQueue.storedReplies.filter((reply) => !loadedReplyIds.has(reply.id))
		]);
	});

	function pendingRepliesUnder(parentReplyId: string | null) {
		return submissionQueue.pendingReplies.filter(
			(pendingReply) => pendingReply.parentReplyId === parentReplyId
		);
	}

	let replyTargetId = $state<string | null>(null);
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
</script>

{#snippet replyCard(reply: ReplyResponse)}
	{@const isAccepted = reply.id === post.acceptedReplyId}
	<article
		class={['rounded-2xl p-3', isAccepted ? 'bg-success-container' : 'bg-surface-container']}
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<ContentByline author={reply.author} createdAt={reply.createdAt} />
			{#if isAccepted}
				<Badge variant="success"><Check size={14} /> {m.thread_accepted_answer()}</Badge>
			{/if}
		</div>
		<p class="mt-2 wrap-break-word whitespace-pre-wrap">{reply.bodyMarkdown}</p>
		<div class="mt-2 flex flex-wrap gap-2 text-sm">
			{#if reply.parentReplyId === null && !post.isLocked}
				<Button variant="outlined" size="compact" onclick={() => (replyTargetId = reply.id)}
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
	<p
		class="mt-4 font-reading text-[17px] leading-[1.65] wrap-break-word whitespace-pre-wrap text-body desktop:text-lg desktop:leading-[1.7]"
	>
		{post.bodyMarkdown}
	</p>
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
					{#if replyTargetId === branch.reply.id && !post.isLocked}
						<ReplyComposer
							label={m.thread_reply_to({ name: branch.reply.author.displayName })}
							onSubmit={(bodyMarkdown) => {
								submissionQueue.submit(bodyMarkdown, branch.reply.id);
								replyTargetId = null;
							}}
							onCancel={() => (replyTargetId = null)}
						/>
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

	<div class="mt-3 flex flex-col gap-3 empty:hidden">
		{#each pendingRepliesUnder(null) as pendingReply (pendingReply.submissionId)}
			<PendingReplyCard
				{pendingReply}
				onRetry={() => submissionQueue.retry(pendingReply.submissionId)}
				onDiscard={() => submissionQueue.discard(pendingReply.submissionId)}
			/>
		{/each}
	</div>

	<div class="mt-6">
		{#if post.isLocked}
			<p class="rounded-2xl bg-surface-container p-4 text-sm" role="status">
				{m.thread_locked_notice()}
			</p>
		{:else}
			<ReplyComposer
				label={m.thread_your_reply()}
				onSubmit={(bodyMarkdown) => submissionQueue.submit(bodyMarkdown, null)}
			/>
		{/if}
	</div>
</section>
