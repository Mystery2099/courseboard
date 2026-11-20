import type { MarkdownTextEdit } from './MarkdownInlineFormatter.ts';

/** The `@` and partial username just before the caret. */
export interface MentionQuery {
	/** Where the `@` is. */
	start: number;
	prefix: string;
}

/** Finds the mention being typed and completes it, following the server's mention rules. */
export class MentionCompletion {
	/**
	 * The same boundary as `MarkdownRenderer`: not after a word, an email address, or a path, though
	 * an `_` that starts italics, as in `_@kim_`, is fine.
	 */
	private static readonly TYPED_MENTION_PATTERN =
		/(?<![\p{L}\p{M}\p{N}!#$%&+/=?^{|}.@-]|[^\s]_)@([A-Za-z0-9_]{1,24})$/u;

	/** The mention being typed when the caret sits at its end, or null. */
	static findQuery(text: string, caret: number): MentionQuery | null {
		const match = MentionCompletion.TYPED_MENTION_PATTERN.exec(text.slice(0, caret));
		if (!match) return null;
		const isCaretAtWordEnd = !/^[A-Za-z0-9_]/.test(text.slice(caret));
		return isCaretAtWordEnd ? { start: match.index, prefix: match[1].toLowerCase() } : null;
	}

	/** Replaces the typed mention with `@username` and a space, leaving the caret after them. */
	static complete(query: MentionQuery, username: string): MarkdownTextEdit {
		const insertedText = `@${username} `;
		const end = query.start + insertedText.length;
		return {
			replaceStart: query.start,
			replaceEnd: query.start + 1 + query.prefix.length,
			insertedText,
			selectionStart: end,
			selectionEnd: end
		};
	}
}
