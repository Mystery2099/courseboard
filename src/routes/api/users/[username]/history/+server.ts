import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import { apiError, apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

/** Only entries their owner marked visible, without notes. Also used to preview your own profile. */
export const GET: RequestHandler = ({ locals, params }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const history = await academicHistoryService.listVisibleEntries(params.username, actor);
		if (!history) return apiError(404, 'user-not-found', 'This user does not exist.');
		return json(history);
	});
