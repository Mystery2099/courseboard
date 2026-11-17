import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer.ts';

describe('Markdown renderer', () => {
	it('renders common formatting', () => {
		const html = MarkdownRenderer.toHtml(
			'**bold** *italic* ~~old~~ `code`\n\n- one\n- two\n\n> quoted\n\n| A | B |\n| - | - |\n| 1 | 2 |'
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
		expect(MarkdownRenderer.toHtml('first\nsecond')).toBe('<p>first<br>\nsecond</p>\n');
		expect(MarkdownRenderer.toHtml('```\nif (x) {\n    y();\n}\n```')).toContain(
			'<pre><code>if (x) {\n    y();\n}\n</code></pre>'
		);
	});

	it('starts body headings below the heading they sit under', () => {
		expect(MarkdownRenderer.toHtml('# Title\n\n###### Deepest')).toBe(
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
		const html = MarkdownRenderer.toHtml(markdown);

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
		'<javascript:alert(1)>'
	])('refuses unsafe link addresses: %s', (markdown) => {
		expect(MarkdownRenderer.toHtml(markdown)).not.toContain('href');
	});

	it('allows web, email, and same-site links and marks them as user content', () => {
		expect(MarkdownRenderer.toHtml('[docs](https://example.com/a)')).toContain(
			'<a href="https://example.com/a" rel="nofollow ugc noopener noreferrer">docs</a>'
		);
		expect(MarkdownRenderer.toHtml('[mail](mailto:prof@example.edu)')).toContain(
			'href="mailto:prof@example.edu"'
		);
		expect(MarkdownRenderer.toHtml('[course](/courses/abc)')).toContain('href="/courses/abc"');
		// Browsers read `/\` as `//`; the encoded backslash keeps it a path on this site.
		expect(MarkdownRenderer.toHtml('[x](/\\evil.example)')).toContain('href="/%5Cevil.example"');
		expect(MarkdownRenderer.toHtml('see https://example.com')).toContain(
			'href="https://example.com"'
		);
	});

	it.each([
		'![a "chart"](https://evil.example/track.png)',
		'![a "chart"](//evil.example/track.png)',
		'![a "chart"](data:image/png;base64,AAAA)'
	])('shows only the description of an image: %s', (markdown) => {
		const html = MarkdownRenderer.toHtml(markdown);

		expect(html).not.toContain('<img');
		expect(html).toContain('a &quot;chart&quot;');
	});

	it('handles deeply nested input without failing', () => {
		const nested = '> '.repeat(5000) + 'deep';

		expect(() => MarkdownRenderer.toHtml(nested)).not.toThrow();
		expect(() => MarkdownRenderer.toHtml('*'.repeat(20000))).not.toThrow();
	});

	it('reads plain text without formatting, link addresses, or code blocks', () => {
		const markdown =
			'## Tips\n\n- Read the **[manual](https://example.com/manual)** first!\n\n```js\nsecret()\n```\n\nRun `npm test`\nnow ![diagram](https://example.com/x.png)';

		expect(MarkdownRenderer.toPlainText(markdown)).toBe(
			'Tips Read the manual first! Run npm test now diagram'
		);
	});
});
