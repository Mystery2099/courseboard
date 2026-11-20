<script lang="ts">
	import { resolve } from '$app/paths';
	import { useQueryClient } from '@tanstack/svelte-query';
	import X from 'lucide-svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { mentionQueryKeys } from '#lib/client/content/MentionApiClient.ts';
	import { THREAD_ROUTE_IDS } from '#lib/client/navigation/CourseChannel.ts';
	import { getRealtimeConnectionAccessor } from '#lib/client/realtime/RealtimeConnectionContext.ts';
	import type { MentionCreatedEvent } from '#lib/contracts/RealtimeContract.ts';

	const realtimeConnection = getRealtimeConnectionAccessor();
	const queryClient = useQueryClient();
	let latestMention = $state<MentionCreatedEvent | null>(null);

	$effect(() =>
		realtimeConnection()?.onMentionCreated((event) => {
			latestMention = event;
			void queryClient.invalidateQueries({ queryKey: mentionQueryKeys.list() });
		})
	);
</script>

<!--
	Stays until it's opened or closed, so there's no time limit to read it. Sits at the top, clear of
	the dock and a thread's reply bar. The live region is always present so the notice is announced.
-->
<div
	class="pointer-events-none fixed inset-x-3 top-3 z-50 flex justify-center"
	role="status"
	aria-live="polite"
>
	{#if latestMention}
		<div
			class="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-inverse-surface py-1 ps-5 pe-1 text-inverse-on-surface shadow-floating"
		>
			<span class="text-sm">
				{latestMention.replyId ? m.mention_notice_in_reply() : m.mention_notice_in_post()}
			</span>
			<a
				href="{resolve(THREAD_ROUTE_IDS[latestMention.postKind], {
					courseId: latestMention.courseId,
					postId: latestMention.postId
				})}{latestMention.replyId ? `#reply-${latestMention.replyId}` : ''}"
				class="min-h-11 content-center rounded-full px-3 text-sm font-semibold underline underline-offset-2"
				onclick={() => (latestMention = null)}>{m.mention_notice_open()}</a
			>
			<Button
				variant="ghost"
				size="icon"
				class="text-inverse-on-surface"
				aria-label={m.mention_notice_dismiss()}
				onclick={() => (latestMention = null)}><X size={18} /></Button
			>
		</div>
	{/if}
</div>
