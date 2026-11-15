/** A message is plain text or, for plurals and other variants, an inlang variant array. */
export type MessageValue = string | VariantMessage[];

export interface VariantMessage {
	declarations: string[];
	selectors: string[];
	match: Record<string, string>;
}

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function textsOf(value: MessageValue): string[] {
	return typeof value === 'string'
		? [value]
		: value.flatMap((variant) => Object.values(variant.match));
}

function placeholdersOf(text: string): Set<string> {
	return new Set([...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]));
}

function edgeWhitespace(text: string): string {
	return `${/^\s*/.exec(text)![0]}|${/\s*$/.exec(text)![0]}`;
}

function isVariantArray(value: unknown): value is VariantMessage[] {
	return (
		Array.isArray(value) &&
		value.every(
			(variant) =>
				typeof variant === 'object' &&
				variant !== null &&
				Array.isArray(variant.declarations) &&
				Array.isArray(variant.selectors) &&
				typeof variant.match === 'object' &&
				Object.values(variant.match).every((text) => typeof text === 'string')
		)
	);
}

/**
 * Returns why a machine translation can't be used as is, or null when it keeps the source's
 * shape: the same placeholders, edge whitespace, and variant declarations and selectors.
 */
export function findTranslationProblem(source: MessageValue, translation: unknown): string | null {
	if (typeof source === 'string') {
		if (typeof translation !== 'string') return 'expected text';
		if (translation.trim() === '') return 'empty';
		if (edgeWhitespace(translation) !== edgeWhitespace(source)) {
			return 'leading or trailing whitespace changed';
		}
	} else {
		if (!isVariantArray(translation) || translation.length !== source.length) {
			return 'expected the same variant structure';
		}
		for (const [index, variant] of translation.entries()) {
			const sourceVariant = source[index];
			if (JSON.stringify(variant.declarations) !== JSON.stringify(sourceVariant.declarations)) {
				return 'variant declarations changed';
			}
			if (JSON.stringify(variant.selectors) !== JSON.stringify(sourceVariant.selectors)) {
				return 'variant selectors changed';
			}
			const matchKeys = Object.keys(variant.match);
			if (
				matchKeys
					.at(-1)
					?.split(',')
					.some((condition) => !condition.trim().endsWith('=*'))
			) {
				return 'the last variant must be the catch-all';
			}
		}
	}

	const sourcePlaceholders = textsOf(source).map(placeholdersOf);
	const allowed = new Set(sourcePlaceholders.flatMap((placeholders) => [...placeholders]));
	const used = new Set<string>();
	for (const text of textsOf(translation as MessageValue)) {
		for (const placeholder of placeholdersOf(text)) {
			if (!allowed.has(placeholder)) return `unknown placeholder {${placeholder}}`;
			used.add(placeholder);
		}
	}
	const missing = [...allowed].filter((placeholder) => !used.has(placeholder));
	return missing.length > 0 ? `missing placeholder {${missing.join('}, {')}}` : null;
}
