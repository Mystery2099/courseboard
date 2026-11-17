import createMarkdownParser, { type MarkdownIt, type Token } from 'markdown-it';

/**
 * Turns user-written Markdown into safe HTML, the same way during server rendering and in the
 * browser. Raw HTML is shown as text, links are limited to web, email, and same-site addresses,
 * and images show only their description, because attachments are displayed separately.
 */
export class MarkdownRenderer {
	private static readonly ALLOWED_LINK_PATTERN = /^(?:https?:|mailto:|\/(?!\/))/i;
	private static readonly SKIPPED_PLAIN_TEXT_BLOCKS = new Set(['fence', 'code_block']);
	private static readonly parser = MarkdownRenderer.createParser();

	/**
	 * `topHeadingLevel` is the level a body's `#` becomes, one below the heading the body sits under,
	 * so user headings never compete with the page's own.
	 */
	static toHtml(markdown: string, topHeadingLevel = 2): string {
		return MarkdownRenderer.parser.render(markdown, { topHeadingLevel });
	}

	/** The readable text of `markdown`, without formatting, link addresses, or code blocks. */
	static toPlainText(markdown: string): string {
		return MarkdownRenderer.parser
			.parse(markdown, {})
			.filter((token) => !MarkdownRenderer.SKIPPED_PLAIN_TEXT_BLOCKS.has(token.type))
			.map((token) => MarkdownRenderer.inlineText(token.children ?? []))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	private static createParser(): MarkdownIt {
		const parser = createMarkdownParser('default', { html: false, linkify: true, breaks: true });
		parser.validateLink = (url) => MarkdownRenderer.ALLOWED_LINK_PATTERN.test(url.trim());

		parser.renderer.rules.image = (tokens, index) =>
			parser.utils.escapeHtml(MarkdownRenderer.inlineText(tokens[index].children ?? []));

		const renderLinkOpen =
			parser.renderer.rules.link_open ??
			((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options));
		parser.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
			tokens[index].attrSet('rel', 'nofollow ugc noopener noreferrer');
			return renderLinkOpen(tokens, index, options, env, renderer);
		};

		parser.core.ruler.push('demote_headings', (state) => {
			const offset = ((state.env.topHeadingLevel as number | undefined) ?? 1) - 1;
			for (const token of state.tokens) {
				if (token.type === 'heading_open' || token.type === 'heading_close') {
					token.tag = `h${Math.min(Number(token.tag.slice(1)) + offset, 6)}`;
				}
			}
		});
		return parser;
	}

	private static inlineText(tokens: Token[]): string {
		return tokens
			.map((token) => {
				if (token.type === 'softbreak' || token.type === 'hardbreak') return ' ';
				if (token.type === 'image') return MarkdownRenderer.inlineText(token.children ?? []);
				return token.type === 'text' || token.type === 'code_inline' ? token.content : '';
			})
			.join('');
	}
}
