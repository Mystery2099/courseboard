/** A message is plain text or, for plurals and other variants, an inlang variant array. */
export type MessageValue = string | VariantMessage[];

export interface VariantMessage {
	declarations: string[];
	selectors: string[];
	match: Record<string, string>;
}

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function placeholdersOf(text: string): Set<string> {
	return new Set([...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]));
}

function edgeWhitespace(text: string): string {
	return `${/^\s*/.exec(text)![0]}|${/\s*$/.exec(text)![0]}`;
}

function isCatchAll(condition: string): boolean {
	return condition.split(',').every((part) => part.trim().endsWith('=*'));
}

function isTextRecord(value: unknown): value is Record<string, string> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every((text) => typeof text === 'string')
	);
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
				isTextRecord(variant.match)
		)
	);
}

/**
 * Checks one translated text against the source text it stands for: not empty, the same edge
 * whitespace, every placeholder of that source text, and no placeholder the message lacks.
 */
function findTextProblem(
	sourceText: string,
	translatedText: unknown,
	messagePlaceholders: Set<string>
): string | null {
	if (typeof translatedText !== 'string') return 'expected text';
	if (translatedText.trim() === '') return 'empty';
	if (edgeWhitespace(translatedText) !== edgeWhitespace(sourceText)) {
		return 'leading or trailing whitespace changed';
	}
	const used = placeholdersOf(translatedText);
	const unknown = [...used].find((placeholder) => !messagePlaceholders.has(placeholder));
	if (unknown) return `unknown placeholder {${unknown}}`;
	const missing = [...placeholdersOf(sourceText)].filter((placeholder) => !used.has(placeholder));
	return missing.length > 0 ? `missing placeholder {${missing.join('}, {')}}` : null;
}

/**
 * Returns why a machine translation can't be used as is, or null when it keeps the source's
 * shape: the same placeholders, edge whitespace, and variant declarations and selectors. A
 * translated plural case is compared with the source case of the same name, or with the source's
 * catch-all for cases only the target language needs.
 */
export function findTranslationProblem(source: MessageValue, translation: unknown): string | null {
	if (typeof source === 'string') {
		return findTextProblem(source, translation, placeholdersOf(source));
	}
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
		const cases = Object.entries(variant.match);
		if (cases.length === 0) return 'no variants';
		if (!isCatchAll(cases.at(-1)![0])) return 'the last variant must be the catch-all';

		const sourceTexts = Object.values(sourceVariant.match);
		const sourceCatchAll = Object.entries(sourceVariant.match).find(([condition]) =>
			isCatchAll(condition)
		)?.[1];
		const messagePlaceholders = new Set(sourceTexts.flatMap((text) => [...placeholdersOf(text)]));
		for (const [condition, text] of cases) {
			const sourceText = sourceVariant.match[condition] ?? sourceCatchAll;
			if (sourceText === undefined) return `no source text for ${condition}`;
			const problem = findTextProblem(sourceText, text, messagePlaceholders);
			if (problem) return `${condition}: ${problem}`;
		}
	}
	return null;
}
