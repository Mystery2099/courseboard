import { describe, expect, it } from 'vitest';
import { LinkPreviewResolver } from './LinkPreviewResolver.ts';

describe('Link preview resolver', () => {
	it.each([
		'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s',
		'https://youtu.be/dQw4w9WgXcQ?t=90',
		'https://m.youtube.com/shorts/dQw4w9WgXcQ'
	])('plays YouTube videos from youtube-nocookie.com: %s', (address) => {
		const preview = LinkPreviewResolver.resolve(address);

		expect(preview).toMatchObject({
			kind: 'youtube',
			thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
		});
		expect(preview?.kind === 'youtube' && preview.playerUrl).toMatch(
			/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?autoplay=1/
		);
	});

	it('starts a YouTube video at its timestamp', () => {
		const preview = LinkPreviewResolver.resolve('https://youtu.be/dQw4w9WgXcQ?t=1m30s');

		expect(preview?.kind === 'youtube' && preview.playerUrl).toContain('start=90');
	});

	it('embeds Spotify tracks compactly and collections at full height', () => {
		expect(
			LinkPreviewResolver.resolve(
				'https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=x'
			)
		).toMatchObject({
			kind: 'spotify',
			playerUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
			isCompact: true
		});
		expect(
			LinkPreviewResolver.resolve('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
		).toMatchObject({ isCompact: false });
	});

	it('shows images, GIFs, and videos linked directly', () => {
		expect(LinkPreviewResolver.resolve('https://example.com/diagram.PNG?size=2')).toMatchObject({
			kind: 'image',
			imageUrl: 'https://example.com/diagram.PNG?size=2'
		});
		expect(LinkPreviewResolver.resolve('https://giphy.com/gifs/cat-typing-JIX9t2j0ZTN9S')).toEqual(
			expect.objectContaining({ imageUrl: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' })
		);
		expect(LinkPreviewResolver.resolve('https://i.imgur.com/abc123.gifv')).toMatchObject({
			kind: 'video',
			videoUrl: 'https://i.imgur.com/abc123.mp4'
		});
	});

	it.each([
		'http://example.com/photo.png',
		'https://user:secret@example.com/photo.png',
		'https://example.com/page',
		'https://www.youtube.com/watch?v=short',
		'https://evil.example/watch?v=dQw4w9WgXcQ',
		'https://open.spotify.com/user/someone',
		'/courses/abc',
		'mailto:prof@example.edu'
	])('previews nothing for %s', (address) => {
		expect(LinkPreviewResolver.resolve(address)).toBeNull();
	});

	it('stops after a few previews', () => {
		const links = Array.from({ length: 6 }, (_, index) => ({
			address: `https://example.com/${index}.png`,
			text: null
		}));

		expect(LinkPreviewResolver.resolveAll(links)).toHaveLength(
			LinkPreviewResolver.MAXIMUM_PREVIEWS_PER_BODY
		);
	});

	it('shares one preview between addresses for the same video, keeping the first link text', () => {
		const previews = LinkPreviewResolver.resolveAll([
			{ address: 'https://youtu.be/dQw4w9WgXcQ', text: 'Lecture 3' },
			{ address: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=share', text: null },
			{ address: 'https://youtu.be/dQw4w9WgXcQ?t=90', text: null }
		]);

		expect(previews.map((preview) => preview.linkText)).toEqual(['Lecture 3', null]);
	});

	it('names a shared preview after a later link with text and ignores fragments', () => {
		const previews = LinkPreviewResolver.resolveAll([
			{ address: 'https://example.com/chart.png#v1', text: null },
			{ address: 'https://example.com/chart.png#v2', text: 'Chart' }
		]);

		expect(previews).toHaveLength(1);
		expect(previews[0].linkText).toBe('Chart');
	});

	it('keeps video time ranges and names previews from links past the limit', () => {
		const links = Array.from({ length: 4 }, (_, index) => ({
			address: `https://example.com/lecture.mp4#t=${index * 60}`,
			text: null
		}));

		const previews = LinkPreviewResolver.resolveAll([
			...links,
			{ address: 'https://example.com/lecture.mp4#t=0', text: 'Intro' }
		]);

		expect(previews).toHaveLength(4);
		expect(previews[0]).toMatchObject({
			videoUrl: 'https://example.com/lecture.mp4#t=0',
			linkText: 'Intro'
		});
	});
});
