import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer.ts';

describe('Markdown renderer', () => {
	it('renders common formatting', () => {
		const html = MarkdownRenderer.toHtml(
			'**bold** *italic* ~~old~~ `code`\n\n- one\n- two\n\n> quoted\n\n| A | B |\n| - | - |\n| 1 | 2 |',
			2
		);

		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<em>italic</em>');
		expect(html).toContain('<s>old</s>');
		expect(html).toContain('<code>code</code>');
		expect(html).toContain('<li>one</li>');
		expect(html).toContain('<blockquote>');
		expect(html).toContain('<table>');
	});

	it('keeps single line breaks and code whitespace', () => {
		expect(MarkdownRenderer.toHtml('first\nsecond', 2)).toBe('<p>first<br>\nsecond</p>\n');
		expect(MarkdownRenderer.toHtml('```\nif (x) {\n    y();\n}\n```', 2)).toContain(
			'<pre tabindex="0"><code>if (x) {\n    y();\n}\n</code></pre>'
		);
	});

	it('starts body headings below the heading they sit under', () => {
		expect(MarkdownRenderer.toHtml('# Title\n\n###### Deepest', 2)).toBe(
			'<h2>Title</h2>\n<h6>Deepest</h6>\n'
		);
		expect(MarkdownRenderer.toHtml('# Reply heading\n\n## Next', 3)).toBe(
			'<h3>Reply heading</h3>\n<h4>Next</h4>\n'
		);
	});

	it.each([
		'<script>alert(1)</script>',
		'<img src=x onerror=alert(1)>',
		'<a href="javascript:alert(1)">x</a>',
		'<iframe src="/x"></iframe>',
		'<div style="position:fixed">x</div>'
	])('shows raw HTML as text: %s', (markdown) => {
		const html = MarkdownRenderer.toHtml(markdown, 2);

		expect(html).not.toMatch(/<(?:script|img|a|iframe|div)\b/i);
		expect(html).toContain('&lt;');
	});

	it.each([
		'[x](javascript:alert(1))',
		'[x](JaVaScRiPt:alert(1))',
		'[x](&#106;avascript:alert(1))',
		'[x](vbscript:msgbox(1))',
		'[x](data:text/html;base64,PHNjcmlwdD4=)',
		'[x](data:image/png;base64,AAAA)',
		'[x](file:///etc/passwd)',
		'[x](//evil.example)',
		'[x](#section)',
		'[x][ref]\n\n[ref]: javascript:alert(1)',
		'<javascript:alert(1)>'
	])('refuses unsafe link addresses: %s', (markdown) => {
		const html = MarkdownRenderer.toHtml(markdown, 2);

		expect(html).not.toContain('href');
		expect(html).not.toContain('](');
	});

	it('never nests links or leaves a stray closing tag', () => {
		expect(MarkdownRenderer.toHtml('[<https://ok.example>](javascript:x)', 2)).toBe(
			'<p><a href="https://ok.example" rel="nofollow ugc noopener noreferrer">https://ok.example</a></p>\n'
		);
		expect(MarkdownRenderer.toHtml('[outer <javascript:alert(1)>](javascript:alert(2))', 2)).toBe(
			'<p>outer javascript:alert(1)</p>\n'
		);
		expect(MarkdownRenderer.toHtml('[before <https://a.example> after](/courses/abc)', 2)).toBe(
			'<p><a href="/courses/abc" rel="nofollow ugc noopener noreferrer">before https://a.example after</a></p>\n'
		);
	});

	it('allows web, email, and same-site links and marks them as user content', () => {
		expect(MarkdownRenderer.toHtml('[docs](https://example.com/a)', 2)).toContain(
			'<a href="https://example.com/a" rel="nofollow ugc noopener noreferrer">docs</a>'
		);
		expect(MarkdownRenderer.toHtml('[mail](mailto:prof@example.edu)', 2)).toContain(
			'href="mailto:prof@example.edu"'
		);
		expect(MarkdownRenderer.toHtml('[course](/courses/abc)', 2)).toContain('href="/courses/abc"');
		// Browsers read `/\` as `//`; the encoded backslash keeps it a path on this site.
		expect(MarkdownRenderer.toHtml('[x](/\\evil.example)', 2)).toContain('href="/%5Cevil.example"');
		expect(MarkdownRenderer.toHtml('see https://example.com', 2)).toContain(
			'href="https://example.com"'
		);
	});

	it.each([
		'![a "chart"](https://evil.example/track.png)',
		'![a "chart"](//evil.example/track.png)',
		'![a "chart"](data:image/png;base64,AAAA)',
		'![a "chart"](chart.png)'
	])('shows only the description of an image: %s', (markdown) => {
		expect(MarkdownRenderer.toHtml(markdown, 2)).toBe('<p>a &quot;chart&quot;</p>\n');
	});

	it('lets keyboard users focus code blocks and tables, which scroll sideways', () => {
		expect(MarkdownRenderer.toHtml('```\ncode\n```', 2)).toContain('<pre tabindex="0">');
		expect(MarkdownRenderer.toHtml('    indented', 2)).toContain('<pre tabindex="0">');
		expect(MarkdownRenderer.toHtml('| A |\n| - |\n| 1 |', 2)).toMatch(
			/^<div class="markdown-table" tabindex="0"><table>[\s\S]*<\/table>\n<\/div>\n$/
		);
	});

	it('handles deeply nested input without failing', () => {
		const nested = '> '.repeat(5000) + 'deep';

		expect(() => MarkdownRenderer.toHtml(nested, 2)).not.toThrow();
		expect(() => MarkdownRenderer.toHtml('*'.repeat(20000), 2)).not.toThrow();
	});

	it('lists only the links it keeps, with the text an author wrote for them', () => {
		const markdown =
			'See https://a.example/1.png and [b](https://b.example)\n\n`https://c.example/x.png`\n\n[x](javascript:alert(1)) ![img](https://d.example/y.png)';

		expect(MarkdownRenderer.toLinks(markdown)).toEqual([
			{ address: 'https://a.example/1.png', text: null },
			{ address: 'https://b.example', text: 'b' }
		]);
	});

	it('reads plain text without formatting, link addresses, or code blocks', () => {
		const markdown =
			'## Tips\n\n- Read the **[manual](https://example.com/manual)** first!\n\n```js\nsecret()\n```\n\nRun `npm test`\nnow ![diagram](https://example.com/x.png)';

		expect(MarkdownRenderer.toPlainText(markdown)).toBe(
			'Tips Read the manual first! Run npm test now diagram'
		);
	});
});
