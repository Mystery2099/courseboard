/** The inline Markdown styles the formatting shortcuts toggle, by the marker that wraps each. */
export const MARKDOWN_INLINE_MARKERS = {
	bold: '**',
	italic: '*',
	code: '`'
} as const;

export type MarkdownInlineStyle = keyof typeof MARKDOWN_INLINE_MARKERS;

/** Replaces `replaceStart` to `replaceEnd` with `insertedText`, then selects the given range. */
export interface MarkdownTextEdit {
	replaceStart: number;
	replaceEnd: number;
	insertedText: string;
	selectionStart: number;
	selectionEnd: number;
}

/**
 * Wraps the selected text in a style's marker, or unwraps it when the marker is already there, as
 * chat apps do. Bold and italic share `*`, so a run of three asterisks counts as both.
 */
export class MarkdownInlineFormatter {
	private static readonly BLANK_LINE_PATTERN = /\n\s*\n/;

	/** Returns null when the style can't apply, because Markdown would show the markers as text. */
	static toggle(
		text: string,
		selectionStart: number,
		selectionEnd: number,
		style: MarkdownInlineStyle
	): MarkdownTextEdit | null {
		// A double-click also selects the space after a word, and `**word **` isn't bold.
		const untrimmed = text.slice(selectionStart, selectionEnd);
		const start = selectionStart + (untrimmed.length - untrimmed.trimStart().length);
		const end = Math.max(start, selectionEnd - (untrimmed.length - untrimmed.trimEnd().length));
		const selected = text.slice(start, end);

		const marker = MARKDOWN_INLINE_MARKERS[style];
		const length = marker.length;
		const markerCharacter = marker[0];
		const runBefore = MarkdownInlineFormatter.countRunBackward(text, start, markerCharacter);
		const runAfter = MarkdownInlineFormatter.countRunForward(text, end, markerCharacter);
		if (MarkdownInlineFormatter.hasStyle(style, Math.min(runBefore, runAfter))) {
			return {
				replaceStart: start - length,
				replaceEnd: end + length,
				insertedText: selected,
				selectionStart: start - length,
				selectionEnd: end - length
			};
		}

		if (selected.length >= 2 * length) {
			const leadingRun = MarkdownInlineFormatter.countRunForward(selected, 0, markerCharacter);
			const trailingRun = MarkdownInlineFormatter.countRunBackward(
				selected,
				selected.length,
				markerCharacter
			);
			if (MarkdownInlineFormatter.hasStyle(style, Math.min(leadingRun, trailingRun))) {
				return {
					replaceStart: start,
					replaceEnd: end,
					insertedText: selected.slice(length, -length),
					selectionStart: start,
					selectionEnd: end - 2 * length
				};
			}
		}

		if (MarkdownInlineFormatter.BLANK_LINE_PATTERN.test(selected)) return null;
		if (style === 'code' && selected.includes(marker)) return null;
		return {
			replaceStart: start,
			replaceEnd: end,
			insertedText: marker + selected + marker,
			selectionStart: start + length,
			selectionEnd: end + length
		};
	}

	private static hasStyle(style: MarkdownInlineStyle, markerRun: number): boolean {
		switch (style) {
			case 'italic':
				return markerRun % 2 === 1;
			case 'bold':
				return markerRun >= 2;
			case 'code':
				return markerRun >= 1;
		}
	}

	private static countRunForward(text: string, from: number, character: string): number {
		let index = from;
		while (text[index] === character) index++;
		return index - from;
	}

	private static countRunBackward(text: string, to: number, character: string): number {
		let index = to;
		while (index > 0 && text[index - 1] === character) index--;
		return to - index;
	}
}
