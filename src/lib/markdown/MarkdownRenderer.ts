import createMarkdownParser, { type MarkdownIt, type Token } from 'markdown-it';

export type MarkdownLink = { address: string; text: string | null };

/** A piece of plain text: either text as written, or an `@username` mention. */
type MentionTextPart = { text: string; mentionedUsername: string | null };

/**
 * Turns user-written Markdown into safe HTML, the same way during server rendering and in the
 * browser. Raw HTML is shown as text, links are limited to web, email, and same-site addresses,
 * and images show only their description, because attachments are displayed separately.
 */
export class MarkdownRenderer {
	private static readonly ALLOWED_LINK_PATTERN = /^(?:https?:|mailto:|\/(?!\/))/i;
	private static readonly SKIPPED_PLAIN_TEXT_BLOCKS = new Set(['fence', 'code_block']);
	/**
	 * `@` and a username, not inside a word, an email address, or a path. Usernames are stored
	 * lowercase, so a match is lowercased before it's compared.
	 */
	private static readonly MENTION_PATTERN =
		/(?<![\p{L}\p{N}_@./+-])@([A-Za-z0-9_]{3,24})(?![A-Za-z0-9_@])/gu;
	/** The same pattern, matching only where it's asked to start. */
	private static readonly MENTION_AT_POSITION_PATTERN = new RegExp(
		MarkdownRenderer.MENTION_PATTERN.source,
		'uy'
	);
	private static readonly parser = MarkdownRenderer.createParser();

	/**
	 * `topHeadingLevel` is the level a body's `#` becomes, one below the heading the body sits under,
	 * so user headings never compete with the page's own. Only `mentionedUsernames`, the mentions the
	 * server confirmed, become profile links; any other `@name` stays text.
	 */
	static toHtml(
		markdown: string,
		topHeadingLevel: 2 | 3,
		mentionedUsernames: readonly string[] = []
	): string {
		return MarkdownRenderer.parser.render(markdown, {
			topHeadingLevel,
			mentionedUsernames: new Set(mentionedUsernames)
		});
	}

	/**
	 * The distinct usernames `@`-mentioned in ordinary text, lowercased, in reading order. Code and
	 * link text don't count.
	 */
	static toMentionedUsernames(markdown: string): string[] {
		const usernames = new Set<string>();
		for (const blockToken of MarkdownRenderer.parser.parse(markdown, {})) {
			MarkdownRenderer.forEachTextOutsideLinks(blockToken.children ?? [], (token) => {
				for (const part of MarkdownRenderer.splitMentions(token.content)) {
					if (part.mentionedUsername) usernames.add(part.mentionedUsername);
				}
			});
		}
		return [...usernames];
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
		// Reads `@username` as plain text before emphasis can, so `@_sam_` stays one mention. Inside
		// an open `_` italic, trailing underscores close it instead, as in `_ask @kim_`.
		parser.inline.ruler.before('emphasis', 'mention_text', (state, silent) => {
			if (state.src.charCodeAt(state.pos) !== 0x40) return false;
			const pattern = MarkdownRenderer.MENTION_AT_POSITION_PATTERN;
			pattern.lastIndex = state.pos;
			const match = pattern.exec(state.src);
			if (!match) return false;
			let mentionText = match[0];
			const isUnderscoreItalicOpen = state.delimiters.some(
				(delimiter) => delimiter.marker === 0x5f && delimiter.open
			);
			if (isUnderscoreItalicOpen) {
				// Keeps `@` and the three characters a username needs at least.
				const closingUnderscores = mentionText.length - mentionText.replace(/_+$/, '').length;
				mentionText = mentionText.slice(0, Math.max(4, mentionText.length - closingUnderscores));
			}
			if (!silent) state.push('text', '', 0).content = mentionText;
			state.pos += mentionText.length;
			return true;
		});

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

		parser.core.ruler.push('link_mentions', (state) => {
			const mentionedUsernames = state.env.mentionedUsernames as ReadonlySet<string> | undefined;
			if (!mentionedUsernames?.size) return;
			for (const blockToken of state.tokens) {
				if (!blockToken.children) continue;
				const linkedTokens = new Map<Token, Token[]>();
				MarkdownRenderer.forEachTextOutsideLinks(blockToken.children, (token) => {
					const parts = MarkdownRenderer.splitMentions(token.content);
					if (!parts.some((part) => part.mentionedUsername)) return;
					linkedTokens.set(
						token,
						parts.flatMap((part) => {
							const text = new state.Token('text', '', 0);
							text.content = part.text;
							if (!part.mentionedUsername || !mentionedUsernames.has(part.mentionedUsername)) {
								return [text];
							}
							const linkOpen = new state.Token('link_open', 'a', 1);
							linkOpen.attrs = [
								['href', `/users/${part.mentionedUsername}`],
								['class', 'mention']
							];
							return [linkOpen, text, new state.Token('link_close', 'a', -1)];
						})
					);
				});
				blockToken.children = blockToken.children.flatMap(
					(token) => linkedTokens.get(token) ?? [token]
				);
			}
		});

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

	/** Calls `visit` for each text token that isn't inside a link. */
	private static forEachTextOutsideLinks(tokens: Token[], visit: (token: Token) => void): void {
		let linkDepth = 0;
		for (const token of tokens) {
			if (token.type === 'link_open') linkDepth += 1;
			else if (token.type === 'link_close') linkDepth -= 1;
			else if (token.type === 'text' && linkDepth === 0) visit(token);
		}
	}

	private static splitMentions(text: string): MentionTextPart[] {
		const parts: MentionTextPart[] = [];
		let textStart = 0;
		for (const match of text.matchAll(MarkdownRenderer.MENTION_PATTERN)) {
			if (match.index > textStart) {
				parts.push({ text: text.slice(textStart, match.index), mentionedUsername: null });
			}
			parts.push({ text: match[0], mentionedUsername: match[1].toLowerCase() });
			textStart = match.index + match[0].length;
		}
		if (textStart < text.length) {
			parts.push({ text: text.slice(textStart), mentionedUsername: null });
		}
		return parts;
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
