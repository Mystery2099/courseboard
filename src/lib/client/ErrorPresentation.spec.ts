import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '#lib/client/ApiRequest.ts';
import { createPostSchema } from '#lib/contracts/PostContract.ts';
import {
	describeErrorCode,
	describeFieldIssues,
	describeRequestFailure
} from './ErrorPresentation.ts';

describe('ErrorPresentation', () => {
	it('translates contract checks, including the length limit', () => {
		const parsed = createPostSchema.safeParse({
			kind: 'question',
			title: 'x'.repeat(151),
			bodyMarkdown: ' '
		});

		expect(parsed.success).toBe(false);
		expect(describeFieldIssues(parsed.error!)).toEqual({
			title: 'Use 150 characters or fewer.',
			bodyMarkdown: 'Write something first.'
		});
	});

	it('shows the translation of an API code instead of the server message', () => {
		const failure = new ApiRequestError(409, 'post-locked', 'Server text');

		expect(describeRequestFailure(failure, () => 'fallback')).toBe(
			'This thread is locked, so it has no new replies.'
		);
		expect(describeRequestFailure(new TypeError('offline'), () => 'fallback')).toBe('fallback');
	});

	it('treats an unknown code as invalid input', () => {
		expect(describeErrorCode('not-a-real-code')).toBe('Check what you entered and try again.');
	});
});
