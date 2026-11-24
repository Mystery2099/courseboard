<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import {
		createInfiniteQuery,
		createMutation,
		createQuery,
		useQueryClient
	} from '@tanstack/svelte-query';
	import { onDestroy, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import CircleX from 'lucide-svelte/icons/circle-x';
	import Copy from 'lucide-svelte/icons/copy';
	import LinkIcon from 'lucide-svelte/icons/link';
	import ReplyIcon from 'lucide-svelte/icons/reply';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import { formatReplyCount, groupReplies } from '#lib/client/content/PostPresentation.ts';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import { ReplySubmissionQueue } from '#lib/client/content/ReplySubmissionQueue.svelte.ts';
	import { ComposerDraftTarget } from '#lib/client/content/ComposerDrafts.svelte.ts';
	import { getAccountLocalData } from '#lib/client/AccountLocalData.ts';
	import type { ReplyAction } from '#lib/client/content/ReplyAction.ts';
	import {
		LINKED_REPLY_QUERY_PARAMETER,
		type LinkedReplyResponse,
		type PostDetailResponse,
		type ReplyListResponse,
		type ReplyResponse
	} from '#lib/contracts/PostContract.ts';
	import type { ThreadReactionsResponse } from '#lib/contracts/ReactionContract.ts';
	import { ThreadReactions } from '#lib/client/content/ThreadReactions.svelte.ts';
	import PendingReplyCard from './PendingReplyCard.svelte';
	import ReplyCard from './ReplyCard.svelte';
	import ReplyComposer from './ReplyComposer.svelte';
	import ReplyActionSheet from './ReplyActionSheet.svelte';
	import DockedReplyComposer from './DockedReplyComposer.svelte';
	import ThreadPostHeader from './ThreadPostHeader.svelte';
	import NewActivityNotice from './NewActivityNotice.svelte';
	import { getCourseActivityNotices } from '#lib/client/realtime/CourseActivityNotices.svelte.ts';
	import { NewActivityReveal } from '#lib/client/realtime/NewActivityReveal.svelte.ts';
	import { ReaderPosition } from '#lib/client/realtime/ReaderPosition.ts';
	import { ScrollTargetReveal } from '#lib/client/navigation/ScrollTargetReveal.ts';

	let {
		initialPost,
		initialReplies,
		linkedReply,
		initialReactions,
		initialLoadedAt
	}: {
		initialPost: PostDetailResponse;
		initialReplies: ReplyListResponse;
		/** The reply the address links to, shown with its branch even before its page is loaded. */
		linkedReply: LinkedReplyResponse | null;
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

	const threadReactions = new ThreadReactions(
		postId,
		untrack(() => initialReactions),
		untrack(() => initialLoadedAt)
	);
	const reactions = $derived(threadReactions.reactions);
	const reactionFailure = $derived(threadReactions.failure);

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
	// Replies sent from this page, and the linked reply with its top-level reply, stay visible even
	// when their page of the thread isn't loaded yet. Once it is, they move to their place in it.
	const shownReplies = $derived.by(() => {
		const loadedReplyIds = new Set(loadedReplies.map((reply) => reply.id));
		const linkedBranch = linkedReply
			? [linkedReply.parentReply, linkedReply.reply].filter((reply) => reply !== null)
			: [];
		const unloadedReplies = [...submissionQueue.storedReplies, ...linkedBranch].filter(
			(reply, index, replies) =>
				!loadedReplyIds.has(reply.id) &&
				replies.findIndex((other) => other.id === reply.id) === index
		);
		return [...loadedReplies, ...unloadedReplies];
	});
	const replyBranches = $derived(groupReplies(shownReplies));

	const courseActivityNotices = getCourseActivityNotices();
	const unshownAnnouncedReplyIds = $derived(
		courseActivityNotices.findNewReplyIds(postId, new Set(shownReplies.map((reply) => reply.id)))
	);
	// While older pages are still unloaded, new replies arrive through Load more replies instead.
	const newReplyIds = $derived(repliesQuery.hasNextPage ? [] : unshownAnnouncedReplyIds);
	const newRepliesReveal = new NewActivityReveal();

	/**
	 * Refetches the thread. New replies are only offered once every page is loaded, so any further
	 * pages hold only replies that arrived since, including ones that filled the last page.
	 */
	async function loadNewReplies() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) }),
			queryClient.invalidateQueries({ queryKey: postQueryKeys.replies(postId) })
		]);
		await loadRemainingReplyPages();
	}

	/**
	 * Loads further pages of replies until `isTargetRendered` holds or the last page is in. Returns
	 * false when a page fails to load.
	 */
	async function loadRemainingReplyPages(isTargetRendered = () => false): Promise<boolean> {
		// Each result says whether another page follows, since the query stops updating once the
		// reader leaves the thread.
		let hasNextPage = repliesQuery.hasNextPage;
		while (hasNextPage && !isTargetRendered()) {
			// Joins a page request already in flight, such as from Load more replies, instead of repeating it.
			const pageResult = await repliesQuery.fetchNextPage({ cancelRefetch: false });
			if (pageResult.isError) return false;
			hasNextPage = pageResult.hasNextPage;
			await tick();
		}
		return true;
	}

	/** Refetches the thread, then moves focus to the first reply shown. */
	async function showNewReplies() {
		const announcedReplyIds = new Set(newReplyIds);
		await newRepliesReveal.reveal(loadNewReplies, () => {
			const firstNewReply = shownReplies.find((reply) => announcedReplyIds.has(reply.id));
			return firstNewReply && `reply-${firstNewReply.id}`;
		});
		// Focus has moved into the replies, so nothing that arrived during this load appears directly.
		wasFollowingArrivalDuringLoad = false;
	}

	// Replies that arrive while the reader is at the end of the thread, reading, appear directly.
	// Focus stays put, and screen readers hear about them through this announcement instead.
	let arrivedRepliesAnnouncement = $state('');
	let isShowingArrivedReplies = $state(false);
	// Replies already waiting when the thread opens, such as on a return to it, stay behind the
	// notice. Bookkeeping for the effect below, not state anything renders.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const seenNewReplyIds = new Set<string>(untrack(() => unshownAnnouncedReplyIds));
	// Whether the reader was at the end when a reply arrived during the last load.
	let wasFollowingArrivalDuringLoad = false;
	let isThreadOpen = true;
	onDestroy(() => (isThreadOpen = false));

	// Before rendering, so the notice never flashes for replies about to appear. Arrivals are
	// recorded even while older pages are unloaded, so one isn't taken as new once they load.
	$effect.pre(() => {
		const replyIds = unshownAnnouncedReplyIds;
		untrack(() => {
			const hasArrival = replyIds.some((replyId) => !seenNewReplyIds.has(replyId));
			for (const replyId of replyIds) seenNewReplyIds.add(replyId);
			if (!hasArrival || repliesQuery.hasNextPage) return;
			const isFollowing = ReaderPosition.isFollowingPageEnd();
			if (newRepliesReveal.isShowing) wasFollowingArrivalDuringLoad ||= isFollowing;
			else if (isFollowing) void showArrivedReplies();
		});
	});

	async function showArrivedReplies() {
		wasFollowingArrivalDuringLoad = false;
		const pageHeightBeforeLoad = document.documentElement.scrollHeight;
		const replyIdsBeforeLoad = new Set(shownReplies.map((reply) => reply.id));
		isShowingArrivedReplies = true;
		try {
			await newRepliesReveal.reveal(loadNewReplies);
		} finally {
			isShowingArrivedReplies = false;
		}
		if (!isThreadOpen) return;
		// A reader who scrolled away from the end or started typing during the load stays put.
		const isStillFollowing =
			ReaderPosition.isReading() && ReaderPosition.isNearPageEnd(pageHeightBeforeLoad);
		if (isStillFollowing) ReaderPosition.scrollToPageEnd();
		const ownReplyIds = new Set(submissionQueue.storedReplies.map((reply) => reply.id));
		announceArrivedReplies(
			shownReplies.filter(
				(reply) => !replyIdsBeforeLoad.has(reply.id) && !ownReplyIds.has(reply.id)
			)
		);
		if (wasFollowingArrivalDuringLoad && isStillFollowing && newReplyIds.length > 0) {
			void showArrivedReplies();
		}
	}

	let announcementTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(announcementTimer));

	function announceArrivedReplies(arrivedReplies: ReplyResponse[]) {
		if (arrivedReplies.length === 0) return;
		const announcement =
			arrivedReplies.length === 1
				? m.realtime_new_reply_from({ name: arrivedReplies[0].author.displayName })
				: m.realtime_new_replies_shown({ count: arrivedReplies.length });
		// Cleared, then set in a later task, so the same words twice in a row are still read out.
		clearTimeout(announcementTimer);
		arrivedRepliesAnnouncement = '';
		announcementTimer = setTimeout(() => (arrivedRepliesAnnouncement = announcement), 100);
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
		replyId: string;
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
			replyId: reply.id,
			parentReplyId: reply.parentReplyId ?? reply.id,
			authorName: reply.author.displayName
		};
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

	/** Scrolls to a reply on the page and highlights it, moving focus there unless told not to. */
	function revealReply(replyId: string, moveFocus = true) {
		const replyElement = document.getElementById(`reply-${replyId}`);
		if (replyElement) ScrollTargetReveal.reveal(replyElement, { moveFocus });
	}

	const isReplyRendered = (replyId: string) => document.getElementById(`reply-${replyId}`) !== null;

	const shownRepliesById = $derived(new Map(shownReplies.map((reply) => [reply.id, reply])));
	/** The reply a nested reply's branch answers, when that branch is shown. */
	const parentReplyOf = (reply: ReplyResponse) =>
		reply.parentReplyId !== null && !isUnderHiddenBranch(reply.parentReplyId)
			? (shownRepliesById.get(reply.parentReplyId) ?? null)
			: null;

	// Replies as the list renders them; nested replies whose branch isn't loaded aren't drawn.
	const renderedReplies = $derived([
		...replyBranches.flatMap((branch) => [branch.reply, ...branch.nestedReplies]),
		...storedRepliesUnderHiddenBranches
	]);
	const latestRenderedReply = $derived(
		renderedReplies.reduce<ReplyResponse | null>(
			(latest, reply) => (latest === null || reply.createdAt > latest.createdAt ? reply : latest),
			null
		)
	);
	const jumpableAcceptedReplyId = $derived(post.kind === 'question' ? post.acceptedReplyId : null);

	type ReplyJump = 'accepted-answer' | 'latest-reply';
	/**
	 * The jump loading pages, if any. One runs at a time, so two can't fetch the same page or fight
	 * over focus. Its buttons are only `aria-disabled` meanwhile, so focus stays on the one pressed.
	 */
	let loadingReplyJump = $state<ReplyJump | null>(null);
	let loadMoreRepliesButton = $state<HTMLElement | null>(null);

	/**
	 * Loads pages until the target reply is drawn, then goes to it. If a page fails, focus goes to
	 * Load more replies, where the failure is shown and the load can be retried. A reader who moved
	 * focus elsewhere during the load, such as into the reply field, is left there.
	 */
	async function jumpToReply(
		jump: ReplyJump,
		isTargetRendered: () => boolean,
		findTargetReplyId: () => string | undefined
	) {
		if (loadingReplyJump) return;
		loadingReplyJump = jump;
		const focusedElementAtStart = document.activeElement;
		let isLoaded: boolean;
		try {
			isLoaded = await loadRemainingReplyPages(isTargetRendered);
		} finally {
			loadingReplyJump = null;
		}
		if (!isThreadOpen) return;
		await tick();
		const focusedElement = document.activeElement;
		if (focusedElement !== focusedElementAtStart && focusedElement !== document.body) return;
		if (!isLoaded) {
			if (loadMoreRepliesButton)
				ScrollTargetReveal.reveal(loadMoreRepliesButton, { moveFocus: true });
			return;
		}
		const targetReplyId = findTargetReplyId();
		if (targetReplyId) revealReply(targetReplyId);
	}

	function jumpToAcceptedReply() {
		const acceptedReplyId = jumpableAcceptedReplyId;
		if (!acceptedReplyId) return;
		void jumpToReply(
			'accepted-answer',
			() => isReplyRendered(acceptedReplyId),
			() => acceptedReplyId
		);
	}

	/** Every remaining page is loaded first, since the newest reply may be on any of them. */
	function jumpToLatestReply() {
		void jumpToReply(
			'latest-reply',
			() => false,
			() => latestRenderedReply?.id
		);
	}

	let repliesList = $state<HTMLElement | null>(null);
	let isLatestReplyBelowView = $state(false);
	let isLatestReplyJumpFocused = $state(false);
	let latestReplyJumpButton = $state<HTMLElement | null>(null);

	// While the button shows, the page's scroll padding clears it too, so focus never lands under it.
	$effect(() => {
		const button = latestReplyJumpButton;
		if (!button) return;
		const root = document.documentElement;
		const updateClearance = () =>
			root.style.setProperty(
				'--latest-reply-jump-clearance',
				`${window.innerHeight - button.getBoundingClientRect().top + 8}px`
			);
		updateClearance();
		const pageResizeObserver = new ResizeObserver(updateClearance);
		pageResizeObserver.observe(document.body);
		window.visualViewport?.addEventListener('resize', updateClearance, { passive: true });
		return () => {
			pageResizeObserver.disconnect();
			window.visualViewport?.removeEventListener('resize', updateClearance);
			root.style.removeProperty('--latest-reply-jump-clearance');
		};
	});

	/**
	 * True in a thread over two screens long when the latest reply, or the end of the loaded replies
	 * while more pages follow, is below what the reader can see.
	 */
	function updateLatestReplyVisibility() {
		const isLongThread = document.documentElement.scrollHeight > window.innerHeight * 2;
		const anchor = repliesQuery.hasNextPage
			? repliesList
			: latestRenderedReply && document.getElementById(`reply-${latestRenderedReply.id}`);
		const anchorTop = anchor?.getBoundingClientRect()[repliesQuery.hasNextPage ? 'bottom' : 'top'];
		isLatestReplyBelowView =
			isLongThread && anchorTop !== undefined && anchorTop > ScrollTargetReveal.visibleAreaBottom();
	}

	// The page's height also changes when the reply bar grows or the phone keyboard opens, since the
	// bar's spacer grows with both.
	$effect(() => {
		void latestRenderedReply;
		void repliesQuery.hasNextPage;
		let frame = 0;
		const scheduleUpdate = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(updateLatestReplyVisibility);
		};
		const pageResizeObserver = new ResizeObserver(scheduleUpdate);
		pageResizeObserver.observe(document.body);
		window.addEventListener('scroll', scheduleUpdate, { passive: true });
		window.addEventListener('resize', scheduleUpdate, { passive: true });
		window.visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true });
		return () => {
			cancelAnimationFrame(frame);
			pageResizeObserver.disconnect();
			window.removeEventListener('scroll', scheduleUpdate);
			window.removeEventListener('resize', scheduleUpdate);
			window.visualViewport?.removeEventListener('resize', scheduleUpdate);
		};
	});

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

	let copyNotice = $state<{ replyId: string; message: string } | null>(null);
	let copyNoticeTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyFromReply(
		reply: ReplyResponse,
		text: string,
		copiedMessage: string,
		failedMessage: string
	) {
		let message: string;
		try {
			await navigator.clipboard.writeText(text);
			message = copiedMessage;
		} catch {
			message = failedMessage;
		}
		clearTimeout(copyNoticeTimer);
		copyNotice = { replyId: reply.id, message };
		copyNoticeTimer = setTimeout(() => (copyNotice = null), 3000);
	}
	onDestroy(() => clearTimeout(copyNoticeTimer));

	/** The thread's address with the reply as a query parameter, which the server loads it by. */
	function linkToReply(reply: ReplyResponse): string {
		const threadPath = resolve(THREAD_ROUTE_IDS[post.kind], { courseId, postId });
		// Reply ids are hexadecimal, so they need no escaping.
		return `${page.url.origin}${threadPath}?${LINKED_REPLY_QUERY_PARAMETER}=${reply.id}#reply-${reply.id}`;
	}

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
			run: () =>
				void copyFromReply(
					reply,
					reply.bodyMarkdown,
					m.thread_reply_text_copied(),
					m.thread_reply_text_copy_failed()
				)
		});
		actions.push({
			id: 'copy-link',
			label: m.thread_copy_reply_link(),
			icon: LinkIcon,
			run: () =>
				void copyFromReply(
					reply,
					linkToReply(reply),
					m.thread_reply_link_copied(),
					m.thread_reply_link_copy_failed()
				)
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

{#snippet replyCard(reply: ReplyResponse)}
	<ReplyCard
		{reply}
		isAccepted={reply.id === post.acceptedReplyId}
		isLinked={reply.id === linkedReply?.reply.id}
		actions={replyActionsFor(reply)}
		reactions={reactions ? (reactions.replies[reply.id] ?? []) : null}
		reactionError={reactionFailure?.replyId === reply.id ? reactionFailure.error : null}
		copyNotice={copyNotice?.replyId === reply.id ? copyNotice.message : ''}
		parentReplyAuthorName={parentReplyOf(reply)?.author.displayName ?? null}
		onShowParentReply={() => reply.parentReplyId && revealReply(reply.parentReplyId)}
		onToggleReaction={(emoji, isAdding) => threadReactions.toggle(reply.id, emoji, isAdding)}
		onOpenActionSheet={(opener) => openReplyActionSheet(reply, opener)}
	/>
{/snippet}

<ThreadPostHeader
	{post}
	reactions={reactions?.post ?? null}
	reactionError={reactionFailure && reactionFailure.replyId === null ? reactionFailure.error : null}
	isLockPending={lockMutation.isPending}
	{actionError}
	onToggleReaction={(emoji, isAdding) => threadReactions.toggle(null, emoji, isAdding)}
	onToggleLock={() => lockMutation.mutate(!post.isLocked)}
	onReviewSaved={showUpdatedPost}
/>

<section class="mt-8" aria-labelledby="replies-heading">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 id="replies-heading" class="text-lg font-semibold">{formatReplyCount(post.replyCount)}</h2>
		{#if jumpableAcceptedReplyId}
			<Button
				variant="tonal"
				size="compact"
				aria-disabled={loadingReplyJump !== null}
				onclick={jumpToAcceptedReply}
				><CircleCheck aria-hidden="true" />{loadingReplyJump === 'accepted-answer'
					? m.common_loading()
					: m.thread_jump_to_accepted_answer()}</Button
			>
		{/if}
	</div>
	{#if isLatestReplyBelowView || isLatestReplyJumpFocused || loadingReplyJump === 'latest-reply'}
		<!-- Fixed above the phone's reply bar or dock and the on-screen keyboard, but early in the tab order. -->
		<Button
			bind:ref={latestReplyJumpButton}
			variant="tonal"
			size="compact"
			class="fixed end-4 bottom-[calc(var(--keyboard-inset,0px)+var(--docked-reply-composer-height,calc(7rem+env(safe-area-inset-bottom))))] z-20 shadow-raised desktop:end-8 desktop:bottom-8"
			aria-disabled={loadingReplyJump !== null}
			onfocus={() => (isLatestReplyJumpFocused = true)}
			onblur={() => (isLatestReplyJumpFocused = false)}
			onclick={jumpToLatestReply}
			><ArrowDown aria-hidden="true" />{loadingReplyJump === 'latest-reply'
				? m.common_loading()
				: m.thread_jump_to_latest_reply()}</Button
		>
	{/if}
	<NewActivityNotice
		label={newReplyIds.length > 0 && !isShowingArrivedReplies
			? m.realtime_show_new_replies({ count: newReplyIds.length })
			: ''}
		isShowing={newRepliesReveal.isShowing}
		onShow={showNewReplies}
	/>
	<p class="sr-only" aria-live="polite">{arrivedRepliesAnnouncement}</p>

	<ul bind:this={repliesList} class="mt-3 flex flex-col gap-3">
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
			bind:ref={loadMoreRepliesButton}
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
			<!-- Its branch, where answers to it go, isn't loaded yet, so it offers no Reply. -->
			{@render replyCard(reply)}
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
		onShowReplyTarget={(moveFocus) => replyTarget && revealReply(replyTarget.replyId, moveFocus)}
	/>
{/if}

<ReplyActionSheet
	isOpen={isActionSheetOpen}
	opener={actionSheetOpener}
	title={actionSheetReply ? m.thread_reply_by({ name: actionSheetReply.author.displayName }) : ''}
	actions={actionSheetReply ? replyActionsFor(actionSheetReply) : []}
	onClose={closeReplyActionSheet}
/>
