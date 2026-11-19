import type { MarkdownLink } from './MarkdownRenderer.ts';

type LinkPreviewMedia =
	| { kind: 'image'; imageUrl: string; isAnimated: boolean }
	| { kind: 'video'; videoUrl: string }
	| { kind: 'youtube'; thumbnailUrl: string; playerUrl: string }
	| { kind: 'spotify'; playerUrl: string; isCompact: boolean };

/** `linkText` is what the author wrote for the link, or null for a bare address. */
export type LinkPreview = LinkPreviewMedia & { sourceUrl: string; linkText: string | null };

/**
 * Recognizes links that can be previewed from the address alone, with no request to the linked
 * site: direct image and video files, YouTube videos, Giphy GIFs, and Spotify items. Only HTTPS
 * addresses are previewed, so a preview never downgrades the page to mixed content.
 */
export class LinkPreviewResolver {
	static readonly MAXIMUM_PREVIEWS_PER_BODY = 4;

	private static readonly IMAGE_PATH_PATTERN = /\.(?:png|jpe?g|gif|webp|avif)$/i;
	private static readonly VIDEO_PATH_PATTERN = /\.(?:mp4|webm)$/i;
	private static readonly YOUTUBE_HOSTS = new Set([
		'youtube.com',
		'www.youtube.com',
		'm.youtube.com',
		'music.youtube.com'
	]);
	private static readonly YOUTUBE_PATH_PATTERN = /^\/(?:shorts|embed|live)\/([\w-]{11})(?:\/|$)/;
	private static readonly YOUTUBE_VIDEO_ID_PATTERN = /^[\w-]{11}$/;
	private static readonly YOUTUBE_TIMESTAMP_PATTERN = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;
	private static readonly GIPHY_PATH_PATTERN = /^\/gifs\/(?:[\w-]*-)?([A-Za-z0-9]+)\/?$/;
	private static readonly SPOTIFY_PATH_PATTERN =
		/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})\/?$/i;
	private static readonly COMPACT_SPOTIFY_TYPES = new Set(['track', 'episode']);

	/**
	 * The previews for `links`, in order and at most a few per body. Links that load the same media,
	 * such as a youtu.be and a youtube.com address for one video, share a preview, named by the first
	 * of them with link text.
	 */
	static resolveAll(links: readonly MarkdownLink[]): LinkPreview[] {
		const previewsByMediaUrl = new Map<string, LinkPreview>();
		for (const link of links) {
			if (previewsByMediaUrl.size === LinkPreviewResolver.MAXIMUM_PREVIEWS_PER_BODY) break;
			const preview = LinkPreviewResolver.resolve(link.address);
			if (!preview) continue;
			const mediaUrl = LinkPreviewResolver.findMediaUrl(preview);
			const sharedPreview = previewsByMediaUrl.get(mediaUrl);
			if (!sharedPreview) {
				previewsByMediaUrl.set(mediaUrl, { ...preview, linkText: link.text });
			} else if (sharedPreview.linkText === null) {
				sharedPreview.linkText = link.text;
			}
		}
		return [...previewsByMediaUrl.values()];
	}

	static resolve(linkAddress: string): LinkPreview | null {
		const media = LinkPreviewResolver.resolveMedia(linkAddress);
		return media ? { ...media, sourceUrl: new URL(linkAddress).href, linkText: null } : null;
	}

	private static findMediaUrl(preview: LinkPreview): string {
		switch (preview.kind) {
			case 'image':
				return preview.imageUrl;
			case 'video':
				return preview.videoUrl;
			default:
				return preview.playerUrl;
		}
	}

	private static resolveMedia(linkAddress: string): LinkPreviewMedia | null {
		let url: URL;
		try {
			url = new URL(linkAddress);
		} catch {
			return null;
		}
		if (url.protocol !== 'https:' || url.username || url.password) return null;
		url.hash = '';
		const host = url.hostname.toLowerCase();

		const youtubeVideoId = LinkPreviewResolver.findYoutubeVideoId(url, host);
		if (youtubeVideoId) {
			const player = new URL(`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`);
			player.searchParams.set('autoplay', '1');
			const startSeconds = LinkPreviewResolver.parseYoutubeTimestamp(
				url.searchParams.get('t') ?? url.searchParams.get('start')
			);
			if (startSeconds) player.searchParams.set('start', String(startSeconds));
			return {
				kind: 'youtube',
				thumbnailUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
				playerUrl: player.href
			};
		}

		if (host === 'open.spotify.com') {
			const match = LinkPreviewResolver.SPOTIFY_PATH_PATTERN.exec(url.pathname);
			if (!match) return null;
			const itemType = match[1].toLowerCase();
			return {
				kind: 'spotify',
				playerUrl: `https://open.spotify.com/embed/${itemType}/${match[2]}`,
				isCompact: LinkPreviewResolver.COMPACT_SPOTIFY_TYPES.has(itemType)
			};
		}

		if (host === 'giphy.com' || host === 'www.giphy.com') {
			const match = LinkPreviewResolver.GIPHY_PATH_PATTERN.exec(url.pathname);
			return match
				? {
						kind: 'image',
						imageUrl: `https://media.giphy.com/media/${match[1]}/giphy.gif`,
						isAnimated: true
					}
				: null;
		}

		// Imgur's .gifv pages wrap an MP4 of the same name.
		if (host === 'i.imgur.com' && url.pathname.toLowerCase().endsWith('.gifv')) {
			return {
				kind: 'video',
				videoUrl: `https://i.imgur.com${url.pathname.slice(0, -'.gifv'.length)}.mp4`
			};
		}
		if (LinkPreviewResolver.IMAGE_PATH_PATTERN.test(url.pathname)) {
			return {
				kind: 'image',
				imageUrl: url.href,
				isAnimated: url.pathname.toLowerCase().endsWith('.gif')
			};
		}
		if (LinkPreviewResolver.VIDEO_PATH_PATTERN.test(url.pathname)) {
			return { kind: 'video', videoUrl: url.href };
		}
		return null;
	}

	private static findYoutubeVideoId(url: URL, host: string): string | null {
		let candidate: string | null = null;
		if (host === 'youtu.be') {
			candidate = url.pathname.slice(1).split('/')[0];
		} else if (LinkPreviewResolver.YOUTUBE_HOSTS.has(host)) {
			candidate =
				url.pathname === '/watch'
					? url.searchParams.get('v')
					: (LinkPreviewResolver.YOUTUBE_PATH_PATTERN.exec(url.pathname)?.[1] ?? null);
		}
		return candidate && LinkPreviewResolver.YOUTUBE_VIDEO_ID_PATTERN.test(candidate)
			? candidate
			: null;
	}

	/** Reads YouTube's `t` parameter, written either as seconds (`90`, `90s`) or as `1m30s`. */
	private static parseYoutubeTimestamp(timestamp: string | null): number {
		const match = timestamp ? LinkPreviewResolver.YOUTUBE_TIMESTAMP_PATTERN.exec(timestamp) : null;
		if (!match) return 0;
		const [hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
		return hours * 3600 + minutes * 60 + seconds;
	}
}
