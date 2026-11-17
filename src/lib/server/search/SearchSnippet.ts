import { MarkdownRenderer } from '#lib/markdown/MarkdownRenderer.ts';

/** Plain-text excerpts of post bodies for search results. */
export class SearchSnippet {
	static readonly MAX_LENGTH = 160;
	private static readonly LEAD_IN_LENGTH = 40;

	/**
	 * About 160 characters of plain text around the first word of `query` found in `markdown`, with
	 * an ellipsis where text was cut. Starts at the beginning when no word is found, as with a
	 * stemmed text-index match.
	 */
	static around(markdown: string, query: string): string {
		const text = MarkdownRenderer.toPlainText(markdown);
		const lowerText = text.toLowerCase();
		const firstMatch = query
			.toLowerCase()
			.split(/\s+/)
			.filter((word) => word.length > 1)
			.map((word) => lowerText.indexOf(word))
			.filter((index) => index >= 0)
			.sort((first, second) => first - second)[0];
		if (text.length <= SearchSnippet.MAX_LENGTH) return text;
		// Start a few words before the match, on a word boundary.
		const leadIn = Math.max(0, (firstMatch ?? 0) - SearchSnippet.LEAD_IN_LENGTH);
		const start = leadIn === 0 ? 0 : text.indexOf(' ', leadIn) + 1;
		const hardEnd = Math.min(text.length, start + SearchSnippet.MAX_LENGTH);
		const lastSpace = text.lastIndexOf(' ', hardEnd);
		const end = hardEnd === text.length || lastSpace <= start ? hardEnd : lastSpace;
		return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
	}
}
