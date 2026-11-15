import { describe, expect, it } from 'vitest';
import { fromTranslatedMessage, toTranslatableMessage } from './TranslatableMessage.ts';
import { findTranslationProblem, type MessageValue } from './TranslationValidator.ts';

const replyCount: MessageValue = [
	{
		declarations: ['input count', 'local countPlural = count: plural'],
		selectors: ['countPlural'],
		match: { 'countPlural=one': '{count} reply', 'countPlural=*': '{count} replies' }
	}
];

describe('machine translation checks', () => {
	it('sends plural cases by category and rebuilds them with the catch-all last', () => {
		expect(toTranslatableMessage(replyCount)).toEqual({
			one: '{count} reply',
			other: '{count} replies'
		});

		const rebuilt = fromTranslatedMessage(replyCount, {
			other: '{count} respuestas',
			one: '{count} respuesta',
			many: '{count} de respuestas'
		});

		expect(findTranslationProblem(replyCount, rebuilt)).toBeNull();
		expect(Object.keys((rebuilt as typeof replyCount)[0].match)).toEqual([
			'countPlural=one',
			'countPlural=many',
			'countPlural=*'
		]);
	});

	it('rejects changed placeholders and edge whitespace', () => {
		expect(findTranslationProblem('Hi {name}', 'Hola {nombre}')).toBe(
			'unknown placeholder {nombre}'
		);
		expect(findTranslationProblem('Hi {name}', 'Hola')).toBe('missing placeholder {name}');
		expect(findTranslationProblem(' · note', '· nota')).toBe(
			'leading or trailing whitespace changed'
		);
		expect(findTranslationProblem(' · note', ' · nota')).toBeNull();
	});
});
