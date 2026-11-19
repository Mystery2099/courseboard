import createMarkdownParser, { type MarkdownIt, type Token } from 'markdown-it';

export type MarkdownLink = { address: string; text: string | null };

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
	static toHtml(markdown: string, topHeadingLevel: 2 | 3): string {
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

	/**
	 * The links `toHtml` keeps, in reading order. `text` is null for a bare address, whose text is
	 * the address itself.
	 */
	static toLinks(markdown: string): MarkdownLink[] {
		const links: MarkdownLink[] = [];
		for (const blockToken of MarkdownRenderer.parser.parse(markdown, {})) {
			const inlineTokens = blockToken.children ?? [];
			inlineTokens.forEach((token, index) => {
				if (token.type !== 'link_open') return;
				const isBareAddress = token.markup === 'linkify' || token.markup === 'autolink';
				const closingIndex = inlineTokens.findIndex(
					(candidate, candidateIndex) => candidateIndex > index && candidate.type === 'link_close'
				);
				const text = MarkdownRenderer.inlineText(
					inlineTokens.slice(index + 1, closingIndex)
				).trim();
				links.push({
					address: String(token.attrGet('href') ?? ''),
					text: isBareAddress || !text ? null : text
				});
			});
		}
		return links;
	}

	private static createParser(): MarkdownIt {
		const parser = createMarkdownParser('default', { html: false, linkify: true, breaks: true });
		// Every address parses, so an image always shows just its description; links are checked
		// after parsing instead.
		parser.validateLink = () => true;
		parser.core.ruler.push('remove_disallowed_links', (state) => {
			for (const blockToken of state.tokens) {
				if (!blockToken.children) continue;
				// An autolink can sit inside a link's text, so openings and closings pair up like brackets.
				// A link inside a kept link is dropped too, because browsers can't nest them.
				const isOpenLinkKept: boolean[] = [];
				blockToken.children = blockToken.children.filter((token) => {
					if (token.type === 'link_open') {
						const isKept =
							!isOpenLinkKept.includes(true) &&
							MarkdownRenderer.ALLOWED_LINK_PATTERN.test(String(token.attrGet('href') ?? ''));
						isOpenLinkKept.push(isKept);
						return isKept;
					}
					return token.type === 'link_close' ? (isOpenLinkKept.pop() ?? true) : true;
				});
			}
		});

		parser.renderer.rules.image = (tokens, index) =>
			parser.utils.escapeHtml(MarkdownRenderer.inlineText(tokens[index].children ?? []));

		// Wide code and tables scroll sideways, so keyboard users need to be able to focus them.
		for (const rule of ['fence', 'code_block'] as const) {
			const renderCode = parser.renderer.rules[rule]!;
			parser.renderer.rules[rule] = (tokens, index, options, env, renderer) =>
				renderCode(tokens, index, options, env, renderer).replace('<pre', '<pre tabindex="0"');
		}
		parser.renderer.rules.table_open = () => '<div class="markdown-table" tabindex="0"><table>\n';
		parser.renderer.rules.table_close = () => '</table>\n</div>\n';

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
