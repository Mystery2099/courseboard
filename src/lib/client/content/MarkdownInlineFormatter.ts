/** The inline Markdown styles the formatting shortcuts toggle, by the marker that wraps each. */
export const MARKDOWN_INLINE_MARKERS = {
	bold: '**',
	italic: '*',
	strikethrough: '~~',
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
	static toggle(
		text: string,
		selectionStart: number,
		selectionEnd: number,
		style: MarkdownInlineStyle
	): MarkdownTextEdit {
		const marker = MARKDOWN_INLINE_MARKERS[style];
		const length = marker.length;
		const markerCharacter = marker[0];
		const runBefore = MarkdownInlineFormatter.countRunBackward(
			text,
			selectionStart,
			markerCharacter
		);
		const runAfter = MarkdownInlineFormatter.countRunForward(text, selectionEnd, markerCharacter);

		if (MarkdownInlineFormatter.hasStyle(style, Math.min(runBefore, runAfter))) {
			return {
				replaceStart: selectionStart - length,
				replaceEnd: selectionEnd + length,
				insertedText: text.slice(selectionStart, selectionEnd),
				selectionStart: selectionStart - length,
				selectionEnd: selectionEnd - length
			};
		}

		const selected = text.slice(selectionStart, selectionEnd);
		if (selected.length >= 2 * length) {
			const leadingRun = MarkdownInlineFormatter.countRunForward(selected, 0, markerCharacter);
			const trailingRun = MarkdownInlineFormatter.countRunBackward(
				selected,
				selected.length,
				markerCharacter
			);
			if (MarkdownInlineFormatter.hasStyle(style, Math.min(leadingRun, trailingRun))) {
				return {
					replaceStart: selectionStart,
					replaceEnd: selectionEnd,
					insertedText: selected.slice(length, -length),
					selectionStart,
					selectionEnd: selectionEnd - 2 * length
				};
			}
		}

		// A double-click also selects the space after a word, and `**word **` isn't bold.
		const wrapStart = selectionStart + (selected.length - selected.trimStart().length);
		const wrapEnd = Math.max(
			wrapStart,
			selectionEnd - (selected.length - selected.trimEnd().length)
		);
		return {
			replaceStart: wrapStart,
			replaceEnd: wrapEnd,
			insertedText: marker + text.slice(wrapStart, wrapEnd) + marker,
			selectionStart: wrapStart + length,
			selectionEnd: wrapEnd + length
		};
	}

	private static hasStyle(style: MarkdownInlineStyle, markerRun: number): boolean {
		switch (style) {
			case 'italic':
				return markerRun % 2 === 1;
			case 'bold':
			case 'strikethrough':
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
