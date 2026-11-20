import { describeValidationIssue } from '#lib/client/ErrorPresentation.ts';
import { createReplySchema } from '#lib/contracts/PostContract.ts';
import type { ComposerDraft } from './ComposerDrafts.svelte.ts';

export type ReplyBodySubmission =
	{ isValid: true; bodyMarkdown: string } | { isValid: false; errorMessage: string };

/** Checks a draft's text as a reply. A valid reply is taken from the draft, which then clears. */
export function takeReplyBody(draft: ComposerDraft): ReplyBodySubmission {
	const parsed = createReplySchema.shape.bodyMarkdown.safeParse(draft.bodyMarkdown);
	if (!parsed.success) {
		return { isValid: false, errorMessage: describeValidationIssue(parsed.error.issues[0]) };
	}
	draft.clearIfUnchanged({ title: '', bodyMarkdown: draft.bodyMarkdown });
	return { isValid: true, bodyMarkdown: parsed.data };
}
