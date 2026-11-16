<script lang="ts">
	import type { Snippet } from 'svelte';
	import UserAvatar from '#lib/components/UserAvatar.svelte';

	interface Props {
		username: string;
		displayName: string;
		imageUrl: string | null;
		/** Shown after the @username, such as the primary school. */
		subtitle?: string | null;
		/** School chips and similar details under the name. */
		children?: Snippet;
	}

	let { username, displayName, imageUrl, subtitle = null, children }: Props = $props();
</script>

<header>
	<div class="h-28 border-b bg-blueprint-grid desktop:h-36" aria-hidden="true"></div>
	<div class="-mt-14 px-4 desktop:px-8">
		<UserAvatar {username} {displayName} {imageUrl} size={104} class="ring-4 ring-background" />
		<h1 class="mt-4 text-3xl font-bold wrap-break-word">{displayName}</h1>
		<p class="mt-1 text-on-surface-variant">
			@{username}{subtitle ? ` · ${subtitle}` : ''}
		</p>
		{@render children?.()}
	</div>
</header>
