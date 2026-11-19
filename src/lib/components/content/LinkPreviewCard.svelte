<script lang="ts">
	import Play from 'lucide-svelte/icons/play';
	import X from 'lucide-svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { LinkPreview } from '#lib/markdown/LinkPreviewResolver.ts';

	let { preview }: { preview: LinkPreview } = $props();

	const sourceHost = $derived(new URL(preview.sourceUrl).hostname);
	let hasFailedToLoad = $state(false);
	// An animated image must be possible to stop, and an <img> can't be paused.
	let isHiddenByReader = $state(false);
	let hasBeenShownAgain = $state(false);
	let hasThumbnailFailedToLoad = $state(false);
	let isYoutubePlayerOpen = $state(false);

	function focusOnMount(element: HTMLElement) {
		element.focus();
	}

	/**
	 * Calls `onFailure` when the media fails, including before hydration: the server-rendered inline
	 * error handler Svelte would rely on is blocked by the CSP.
	 */
	function reportLoadFailure(onFailure: () => void) {
		return (element: HTMLImageElement | HTMLVideoElement) => {
			const hasAlreadyFailed =
				element instanceof HTMLImageElement
					? element.complete && element.naturalWidth === 0
					: element.error !== null;
			if (hasAlreadyFailed) {
				onFailure();
				return;
			}
			element.addEventListener('error', onFailure);
			return () => element.removeEventListener('error', onFailure);
		};
	}
</script>

{#if isHiddenByReader}
	<Button
		{@attach focusOnMount}
		variant="text"
		size="compact"
		onclick={() => {
			isHiddenByReader = false;
			hasBeenShownAgain = true;
		}}
	>
		{m.link_preview_show_image()}
	</Button>
{:else if !hasFailedToLoad}
	<div class="relative w-fit max-w-full overflow-hidden rounded-2xl border bg-surface-container">
		{#if preview.kind === 'image'}
			<!-- An external address, which resolve() doesn't apply to. -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={preview.sourceUrl}
				target="_blank"
				rel="nofollow ugc noopener noreferrer"
				class="block focus-visible:-outline-offset-4"
				aria-label={preview.linkText ?? m.link_preview_open_image({ host: sourceHost })}
			>
				<img
					class="block max-h-80 min-h-13 max-w-full min-w-13 object-contain"
					src={preview.imageUrl}
					alt=""
					loading="lazy"
					referrerpolicy="no-referrer"
					{@attach reportLoadFailure(() => (hasFailedToLoad = true))}
				/>
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<button
				{@attach (element) => {
					if (hasBeenShownAgain) element.focus();
				}}
				type="button"
				class="absolute top-2 right-2 flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
				aria-label={m.link_preview_hide_image()}
				onclick={() => (isHiddenByReader = true)}
			>
				<X class="size-5" aria-hidden="true" />
			</button>
		{:else if preview.kind === 'video'}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="block max-h-80 max-w-full"
				src={preview.videoUrl}
				controls
				playsinline
				preload="metadata"
				aria-label={preview.linkText ?? m.link_preview_video({ host: sourceHost })}
				{@attach reportLoadFailure(() => (hasFailedToLoad = true))}
			></video>
		{:else if preview.kind === 'youtube'}
			<!-- YouTube's player needs at least 200px of height. -->
			<div class="aspect-video min-h-50 w-120 max-w-full">
				{#if isYoutubePlayerOpen}
					<iframe
						{@attach focusOnMount}
						class="size-full"
						src={preview.playerUrl}
						title={m.link_preview_youtube_player()}
						allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
						referrerpolicy="strict-origin-when-cross-origin"
					></iframe>
				{:else}
					<button
						type="button"
						class="group relative block size-full cursor-pointer bg-black focus-visible:-outline-offset-4"
						aria-label={preview.linkText
							? m.link_preview_play_titled({ title: preview.linkText })
							: m.link_preview_play_youtube()}
						onclick={() => (isYoutubePlayerOpen = true)}
					>
						{#if !hasThumbnailFailedToLoad}
							<img
								class="size-full object-cover"
								src={preview.thumbnailUrl}
								alt=""
								loading="lazy"
								referrerpolicy="no-referrer"
								{@attach reportLoadFailure(() => (hasThumbnailFailedToLoad = true))}
							/>
						{/if}
						<span
							class="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-110"
						>
							<Play class="size-7 fill-current" aria-hidden="true" />
						</span>
					</button>
				{/if}
			</div>
		{:else}
			<iframe
				class={['block w-120 max-w-full', preview.isCompact ? 'h-38' : 'h-88']}
				src={preview.playerUrl}
				title={m.link_preview_spotify_player()}
				loading="lazy"
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
			></iframe>
		{/if}
	</div>
{/if}
