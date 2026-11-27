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
		/** Shown beside the name, such as Edit profile. */
		actions?: Snippet;
	}

	let { username, displayName, imageUrl, subtitle = null, children, actions }: Props = $props();
</script>

<!-- A short banner and avatar, so the history starts high on a phone. -->
<header>
	<div class="h-16 border-b bg-(image:--banner) desktop:h-24" aria-hidden="true"></div>
	<div class="-mt-10 px-4 desktop:px-8">
		<UserAvatar {username} {displayName} {imageUrl} size={80} class="ring-4 ring-background" />
		<div class="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
			<div class="min-w-0">
				<h1 class="text-2xl leading-tight font-bold wrap-break-word">{displayName}</h1>
				<p class="mt-0.5 text-on-surface-variant">
					@{username}{subtitle ? ` · ${subtitle}` : ''}
				</p>
			</div>
			{@render actions?.()}
		</div>
		{@render children?.()}
	</div>
</header>
