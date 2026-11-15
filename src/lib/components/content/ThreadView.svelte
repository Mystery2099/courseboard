<script lang="ts">
	import { createInfiniteQuery, createMutation, createQuery } from '@tanstack/svelte-query';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { untrack } from 'svelte';
	import Check from 'lucide-svelte/icons/check';
	import Lock from 'lucide-svelte/icons/lock';
	import { ApiRequestError } from '#lib/client/ApiRequest.ts';
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
	<article class={['rounded-2xl p-3', isAccepted ? 'bg-emerald-50' : 'bg-slate-50']}>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<ContentByline author={reply.author} createdAt={reply.createdAt} />
			{#if isAccepted}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-semibold text-emerald-900"
					><Check size={14} /> Accepted answer</span
				>
			{/if}
		</div>
		<p class="mt-2 wrap-break-word whitespace-pre-wrap">{reply.bodyMarkdown}</p>
		<div class="mt-2 flex flex-wrap gap-2 text-sm">
			{#if reply.parentReplyId === null && !post.isLocked}
				<button
					type="button"
					class="rounded-full border px-3 py-1"
					onclick={() => (replyTargetId = reply.id)}>Reply</button
				>
			{/if}
			{#if post.viewerPermissions.canChooseAcceptedReply}
				<button
					type="button"
					class="rounded-full border px-3 py-1 disabled:opacity-50"
					disabled={acceptedReplyMutation.isPending}
					onclick={() => acceptedReplyMutation.mutate(isAccepted ? null : reply.id)}
					>{isAccepted ? 'Clear accepted answer' : 'Accept as answer'}</button
				>
			{/if}
		</div>
	</article>
{/snippet}

<article>
	<div class="flex flex-wrap items-center gap-2">
		<ThreadKindBadge kind={post.kind} />
		{#if post.isLocked}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-sm font-semibold text-slate-800"
				><Lock size={14} /> Locked</span
			>
		{/if}
	</div>
	<h2 class="mt-2 text-2xl font-semibold wrap-break-word">{post.title}</h2>
	<div class="mt-2"><ContentByline author={post.author} createdAt={post.createdAt} /></div>
	{#if post.editedAt}
		<p class="mt-1 text-sm text-slate-600">Edited <time datetime={post.editedAt}>{new Date(post.editedAt).toLocaleDateString()}</time></p>
	{/if}
	{#if post.reviewData}
		<ReviewFacts review={post.reviewData} />
	{/if}
	<p class="mt-4 wrap-break-word whitespace-pre-wrap">{post.bodyMarkdown}</p>
	{#if post.viewerPermissions.canEditReview}
		<details bind:open={isReviewEditorOpen} class="mt-4 rounded-[20px] border p-4">
			<summary class="min-h-11 cursor-pointer py-2 font-semibold text-blue-700">Edit your review</summary>
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
		<button
			type="button"
			class="mt-4 rounded-full border px-4 py-1.5 text-sm disabled:opacity-50"
			disabled={lockMutation.isPending}
			onclick={() => lockMutation.mutate(!post.isLocked)}
			>{post.isLocked ? 'Unlock thread' : 'Lock thread'}</button
		>
	{/if}
	{#if actionError}
		<p class="mt-2 text-sm text-red-700" role="alert">
			{actionError instanceof ApiRequestError
				? actionError.message
				: 'That change could not be saved. Try again.'}
		</p>
	{/if}
</article>

<section class="mt-8" aria-labelledby="replies-heading">
	<h3 id="replies-heading" class="text-lg font-semibold">{formatReplyCount(post.replyCount)}</h3>

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
							label="Reply to {branch.reply.author.displayName}"
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
		<button
			type="button"
			class="mt-3 rounded-full border px-4 py-1.5 disabled:opacity-50"
			disabled={repliesQuery.isFetchingNextPage}
			onclick={() => repliesQuery.fetchNextPage()}
			>{repliesQuery.isFetchingNextPage ? 'Loading…' : 'Load more replies'}</button
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
			<p class="rounded-2xl bg-slate-100 p-4 text-sm" role="status">
				This thread is locked, so it has no new replies.
			</p>
		{:else}
			<ReplyComposer
				label="Your reply"
				onSubmit={(bodyMarkdown) => submissionQueue.submit(bodyMarkdown, null)}
			/>
		{/if}
	</div>
</section>
