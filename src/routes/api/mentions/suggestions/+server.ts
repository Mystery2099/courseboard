import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import { mentionSuggestionService } from '#lib/server/mentions/MentionSuggestionService.ts';
import type { RequestHandler } from './$types';

/** People to offer for an `@` mention that starts with `prefix`. */
export const GET: RequestHandler = ({ locals, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		return json(
			await mentionSuggestionService.suggestPeople(Object.fromEntries(url.searchParams), actor)
		);
	});
