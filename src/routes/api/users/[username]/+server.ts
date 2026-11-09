import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { apiError, apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const profile = await userProfileService.getPublicProfile(params.username, actor);
		if (!profile) return apiError(404, 'user-not-found', 'This user does not exist.');
		return json(profile);
	});
