import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import {
	apiError,
	apiResponse,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import { courseModeratorService } from '#lib/server/moderation/CourseModeratorService.ts';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		requireSameOriginWrite(request);
		if (!(await courseModeratorService.removeAssignment(params.assignmentId, actor))) {
			return apiError(
				404,
				'moderator-assignment-not-found',
				'This moderator assignment no longer exists.'
			);
		}
		return new Response(null, { status: 204 });
	});
