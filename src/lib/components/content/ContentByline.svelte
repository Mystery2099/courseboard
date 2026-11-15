<script lang="ts">
	import { resolve } from '$app/paths';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import { formatRelativeTime } from '#lib/client/content/PostPresentation.ts';
	import type { PostAuthorResponse } from '#lib/contracts/PostContract.ts';

	let { author, createdAt }: { author: PostAuthorResponse; createdAt: string } = $props();
</script>

<div class="flex items-center gap-2 text-sm">
	<UserAvatar username={author.username} displayName={author.displayName} size={28} />
	<a
		class="font-semibold hover:underline"
		href={resolve('/(app)/users/[username]', { username: author.username })}>{author.displayName}</a
	>
	<span class="text-slate-600">
		· <time datetime={createdAt}>{formatRelativeTime(createdAt)}</time>
	</span>
</div>
