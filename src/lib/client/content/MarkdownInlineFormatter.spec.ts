import { describe, expect, it } from 'vitest';
import { MarkdownInlineFormatter, type MarkdownInlineStyle } from './MarkdownInlineFormatter.ts';

/** Applies a toggle to text whose selection is marked with `[` and `]`. */
function toggle(markedText: string, style: MarkdownInlineStyle): string {
	const start = markedText.indexOf('[');
	const end = markedText.indexOf(']') - 1;
	const text = markedText.replace('[', '').replace(']', '');
	const edit = MarkdownInlineFormatter.toggle(text, start, end, style);
	if (!edit) return markedText;
	const result = text.slice(0, edit.replaceStart) + edit.insertedText + text.slice(edit.replaceEnd);
	return (
		result.slice(0, edit.selectionStart) +
		'[' +
		result.slice(edit.selectionStart, edit.selectionEnd) +
		']' +
		result.slice(edit.selectionEnd)
	);
}

describe('MarkdownInlineFormatter', () => {
	it('wraps the selection, or places the caret between new markers', () => {
		expect(toggle('a [word] b', 'bold')).toBe('a **[word]** b');
		expect(toggle('a [] b', 'code')).toBe('a `[]` b');
	});

	it('unwraps markers around or inside the selection', () => {
		expect(toggle('a **[word]** b', 'bold')).toBe('a [word] b');
		expect(toggle('a [**word**] b', 'bold')).toBe('a [word] b');
		expect(toggle('a `[]` b', 'code')).toBe('a [] b');
	});

	it('tells italic and bold apart, since both use asterisks', () => {
		expect(toggle('**[word]**', 'italic')).toBe('***[word]***');
		expect(toggle('***[word]***', 'italic')).toBe('**[word]**');
		expect(toggle('***[word]***', 'bold')).toBe('*[word]*');
		expect(toggle('[*see **this** now*]', 'italic')).toBe('[see **this** now]');
		expect(toggle('**[bold *it* more]**', 'bold')).toBe('[bold *it* more]');
		expect(toggle('*[word]*', 'bold')).toBe('***[word]***');
	});

	it('leaves surrounding spaces outside the markers', () => {
		expect(toggle('[word ]next', 'italic')).toBe('*[word]* next');
		expect(toggle('[**word** ]next', 'bold')).toBe('[word] next');
	});

	it("leaves text alone where Markdown wouldn't render the style", () => {
		expect(toggle('[one\n\ntwo]', 'bold')).toBe('[one\n\ntwo]');
		expect(toggle('[a`b]', 'code')).toBe('[a`b]');
		expect(toggle('[`a` and `b`]', 'code')).toBe('[`a` and `b`]');
		expect(toggle('**[a** and **b]**', 'bold')).toBe('**[a** and **b]**');
		expect(toggle('[***word***]', 'italic')).toBe('[**word**]');
	});
});
