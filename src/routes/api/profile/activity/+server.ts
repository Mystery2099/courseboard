import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { profileActivityService } from '#lib/server/content/ProfileActivityService.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

/** One page of the caller's own posts, replies, or reviews. There is no route for anyone else's. */
export const GET: RequestHandler = ({ locals, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		return json(
			await profileActivityService.listOwnActivity(Object.fromEntries(url.searchParams), actor)
		);
	});
