import { describe, expect, it } from 'vitest';
import { SearchSnippet } from './SearchSnippet.ts';

describe('search snippet', () => {
	it('strips Markdown syntax but keeps link text and punctuation', () => {
		const markdown =
			'## Tips\n\n- Read the **[manual](https://example.com/manual)** first!\n\n```js\nsecret()\n```';

		expect(SearchSnippet.around(markdown, 'manual')).toBe('Tips Read the manual first!');
	});

	it('cuts a long body around the first matched word, on word boundaries', () => {
		const body = `${'filler '.repeat(40)}the midterm covers indexes ${'padding '.repeat(40)}`;

		const snippet = SearchSnippet.around(body, 'MIDTERM review');

		expect(snippet).toMatch(/^…filler .*the midterm covers indexes .*padding…$/);
		expect(snippet.length).toBeLessThanOrEqual(SearchSnippet.MAX_LENGTH + 2);
	});
});
