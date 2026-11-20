import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import { mentionService } from '#lib/server/mentions/MentionService.ts';
import type { RequestHandler } from './$types';

/** One page of the posts and replies that mention the signed-in user, newest first. */
export const GET: RequestHandler = ({ locals, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		return json(await mentionService.listMentions(Object.fromEntries(url.searchParams), actor));
	});
