import type { MessageValue, VariantMessage } from './TranslationValidator.ts';

/** What the model sees: plain text, or a plural message's texts by CLDR category. */
export type TranslatableMessage = string | Record<string, string>;

const CATCH_ALL = '*';
const CATCH_ALL_CATEGORY = 'other';

/** A plural message with one variant block and one selector, the only kind this project uses. */
function pluralSelector(source: MessageValue): string | null {
	if (typeof source === 'string' || source.length !== 1 || source[0].selectors.length !== 1) {
		return null;
	}
	return source[0].selectors[0];
}

/**
 * Models rewrite nested variant structure unreliably, and structured output drops `=` and `*`
 * from keys, so a plural message is sent as `{ one: "…", other: "…" }`. Other variant messages
 * are sent unchanged.
 */
export function toTranslatableMessage(source: MessageValue): TranslatableMessage | MessageValue {
	const selector = pluralSelector(source);
	if (selector === null) return source;
	const [variant] = source as VariantMessage[];
	return Object.fromEntries(
		Object.entries(variant.match).map(([condition, text]) => {
			const category = condition.slice(`${selector}=`.length);
			return [category === CATCH_ALL ? CATCH_ALL_CATEGORY : category, text];
		})
	);
}

/** Rebuilds a plural message from translated categories, keeping the catch-all case last. */
export function fromTranslatedMessage(source: MessageValue, translated: unknown): unknown {
	const selector = pluralSelector(source);
	if (selector === null) return translated;
	if (typeof translated !== 'object' || translated === null || Array.isArray(translated)) {
		return translated;
	}
	const cases = Object.entries(translated as Record<string, unknown>);
	const toCondition = (category: string) =>
		`${selector}=${category === CATCH_ALL_CATEGORY ? CATCH_ALL : category}`;
	const match = Object.fromEntries(
		[
			...cases.filter(([category]) => category !== CATCH_ALL_CATEGORY),
			...cases.filter(([category]) => category === CATCH_ALL_CATEGORY)
		].map(([category, text]) => [toCondition(category), text])
	);
	const [variant] = source as VariantMessage[];
	return [{ declarations: variant.declarations, selectors: variant.selectors, match }];
}
