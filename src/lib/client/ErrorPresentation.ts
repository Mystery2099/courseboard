import { tick } from 'svelte';
import type { core, ZodError } from 'zod';
import { ApiRequestError } from '#lib/client/ApiRequest.ts';
import { isErrorCode, type ErrorCode } from '#lib/contracts/ErrorContract.ts';
import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';

/** Typed as a full record, so a new code doesn't compile until it has a translation. */
const ERROR_MESSAGES: Record<ErrorCode, () => string> = {
	unauthenticated: m.error_unauthenticated,
	'not-admitted': m.error_not_admitted,
	suspended: m.error_suspended,
	'onboarding-required': m.error_onboarding_required,
	'already-onboarded': m.error_already_onboarded,
	forbidden: m.error_forbidden,
	'invalid-input': m.error_invalid_input,
	'internal-error': m.error_internal_error,
	unavailable: m.error_unavailable,
	'course-not-found': m.error_course_not_found,
	'post-not-found': m.error_post_not_found,
	'reply-not-found': m.error_reply_not_found,
	'user-not-found': m.error_user_not_found,
	'institution-not-found': m.error_institution_not_found,
	'entry-not-found': m.error_entry_not_found,
	'post-locked': m.error_post_locked,
	'parent-reply-unavailable': m.error_parent_reply_unavailable,
	'not-a-question': m.error_not_a_question,
	'reactions-not-allowed': m.error_reactions_not_allowed,
	'history-required': m.error_history_required,
	'review-exists': m.error_review_exists,
	'entry-limit-reached': m.error_entry_limit_reached,
	'entry-exists': m.error_entry_exists,
	'username-unavailable': m.error_username_unavailable,
	'email-mismatch': m.error_email_mismatch,
	'invitation-unavailable': m.error_invitation_unavailable,
	'invitation-link-invalid': m.error_invitation_link_invalid,
	'moderator-assignment-not-found': m.error_moderator_assignment_not_found,
	'title-required': m.validation_title_required,
	'body-required': m.validation_body_required,
	'text-too-long': m.validation_text_too_long,
	'single-line-required': m.validation_single_line_required,
	'control-characters': m.validation_control_characters,
	'username-format': m.validation_username_format,
	'display-name-required': m.validation_display_name_required,
	'term-required': m.validation_term_required,
	'school-required': m.validation_school_required,
	'email-invalid': m.validation_email_invalid,
	'unanswered-requires-question': m.validation_unanswered_requires_question,
	'profile-change-required': m.validation_profile_change_required
};

/** Translates an error code from the server; an unknown code reads as invalid input. */
export function describeErrorCode(code: string): string {
	return ERROR_MESSAGES[isErrorCode(code) ? code : 'invalid-input']();
}

/** Translates a failed contract check, including the length limit when the check carries one. */
export function describeValidationIssue(issue: core.$ZodIssue): string {
	if (issue.code === 'too_big' && issue.message === 'text-too-long') {
		const maximum = new Intl.NumberFormat(getLocale()).format(Number(issue.maximum));
		return m.validation_text_too_long_with_limit({ maximum });
	}
	return describeErrorCode(issue.message);
}

/** The first translated issue of each top-level field, keyed by field name. */
export function describeFieldIssues(error: ZodError): Record<string, string | undefined> {
	const messages: Record<string, string | undefined> = {};
	for (const issue of error.issues) {
		const field = issue.path[0];
		if (typeof field === 'string') messages[field] ??= describeValidationIssue(issue);
	}
	return messages;
}

/** Translates a failed API request, or uses the fallback when the request never got an answer. */
export function describeRequestFailure(cause: unknown, fallback: () => string): string {
	return cause instanceof ApiRequestError ? describeErrorCode(cause.code) : fallback();
}

/** Moves focus to the form's first field marked invalid, once the errors have rendered. */
export async function focusFirstInvalidField(form: HTMLFormElement): Promise<void> {
	await tick();
	form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
