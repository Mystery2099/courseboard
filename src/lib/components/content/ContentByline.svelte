<script lang="ts">
	import { resolve } from '$app/paths';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import { formatRelativeTime } from '#lib/client/content/PostPresentation.ts';
	import type { PostAuthorResponse } from '#lib/contracts/PostContract.ts';

	let { author, createdAt }: { author: PostAuthorResponse; createdAt: string } = $props();
</script>

<!-- The avatar and name are one link, 44px tall, so the whole author is an easy target. -->
<div class="flex flex-wrap items-center gap-x-1 text-sm">
	<a
		class="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-full pr-2 pl-1 font-semibold hover:underline"
		href={resolve('/(app)/users/[username]', { username: author.username })}
	>
		<UserAvatar username={author.username} displayName={author.displayName} size={28} />
		{author.displayName}
	</a>
	<span class="text-on-surface-variant">
		· <time datetime={createdAt}>{formatRelativeTime(createdAt)}</time>
	</span>
</div>
