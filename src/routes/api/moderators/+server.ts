import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import { courseModeratorService } from '#lib/server/moderation/CourseModeratorService.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		return json(await courseModeratorService.listAssignments(locals.currentUser));
	});

export const POST: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		const result = await courseModeratorService.assignModerator(await readApiJson(request), actor);
		switch (result.kind) {
			case 'assigned':
				return json(result.assignment, { status: 201 });
			case 'course-not-found':
				return apiError(404, 'course-not-found', 'This course does not exist.');
			case 'user-not-found':
				return apiError(404, 'user-not-found', 'No onboarded user has this username.');
		}
	});
