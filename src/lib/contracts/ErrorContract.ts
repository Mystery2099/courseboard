/**
 * Errors cross the client/server boundary as stable codes, never as display text. The server may
 * add an English `message` for logs and other API clients; the web client translates the code.
 */
export const REQUEST_ERROR_CODES = [
	'unauthenticated',
	'not-admitted',
	'suspended',
	'onboarding-required',
	'already-onboarded',
	'forbidden',
	'invalid-input',
	'internal-error',
	'unavailable',
	'course-not-found',
	'post-not-found',
	'reply-not-found',
	'user-not-found',
	'institution-not-found',
	'entry-not-found',
	'post-locked',
	'parent-reply-unavailable',
	'not-a-question',
	'history-required',
	'review-exists',
	'entry-limit-reached',
	'entry-exists',
	'username-unavailable',
	'email-mismatch',
	'invitation-unavailable',
	'invitation-link-invalid'
] as const;

export type RequestErrorCode = (typeof REQUEST_ERROR_CODES)[number];

/** Used as the `message` of contract schema checks, so forms on either side can translate them. */
export const VALIDATION_ERROR_CODES = [
	'title-required',
	'body-required',
	'text-too-long',
	'single-line-required',
	'control-characters',
	'username-format',
	'display-name-required',
	'term-required',
	'school-required',
	'email-invalid',
	'unanswered-requires-question',
	'profile-change-required'
] as const;

export type ValidationErrorCode = (typeof VALIDATION_ERROR_CODES)[number];

export type ErrorCode = RequestErrorCode | ValidationErrorCode;

const ERROR_CODES: ReadonlySet<string> = new Set([
	...REQUEST_ERROR_CODES,
	...VALIDATION_ERROR_CODES
]);

export function isErrorCode(value: unknown): value is ErrorCode {
	return typeof value === 'string' && ERROR_CODES.has(value);
}

/** A failed contract check's message is a validation code; anything else becomes `invalid-input`. */
export function toValidationCode(issueMessage: string | undefined): ErrorCode | undefined {
	if (issueMessage === undefined) return undefined;
	return isErrorCode(issueMessage) ? issueMessage : 'invalid-input';
}
