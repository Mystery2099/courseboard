<script lang="ts">
	import { buttonClass } from '#lib/components/ui/ControlStyles.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Plus from 'lucide-svelte/icons/plus';
	import type { PostListResponse, ThreadKind } from '#lib/contracts/PostContract.ts';
	import { THREAD_ROUTE_IDS } from '#lib/navigation/CourseChannel.ts';
	import PostComposerDialog from './PostComposerDialog.svelte';
	import PostList from './PostList.svelte';

	let {
		courseId,
		kind,
		initialPage,
		initialPageLoadedAt
	}: {
		courseId: string;
		kind: ThreadKind;
		initialPage: PostListResponse;
		initialPageLoadedAt: number;
	} = $props();

	let isComposerOpen = $state(false);
	const isQuestionChannel = $derived(kind === 'question');
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<h2 class="text-xl font-semibold">
		{isQuestionChannel ? m.course_channel_questions() : m.course_channel_discussion()}
	</h2>
	<button
		type="button"
		class={buttonClass('filled', 'compact')}
		onclick={() => (isComposerOpen = true)}
		><Plus size={18} />
		{isQuestionChannel
			? m.post_composer_ask_question()
			: m.post_composer_start_discussion()}</button
	>
</div>

<PostList
	{courseId}
	{kind}
	{initialPage}
	{initialPageLoadedAt}
	emptyMessage={isQuestionChannel
		? m.thread_channel_questions_empty()
		: m.thread_channel_discussion_empty()}
/>

<PostComposerDialog
	bind:open={isComposerOpen}
	{courseId}
	{kind}
	onCreated={(post) => goto(resolve(THREAD_ROUTE_IDS[kind], { courseId, postId: post.id }))}
/>
