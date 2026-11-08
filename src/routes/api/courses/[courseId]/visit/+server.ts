import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseNavigationService } from '#lib/server/catalog/CourseNavigationService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

/** Records the course as the caller's last visited one, which sign-in resumes. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		await readApiJson(request);
		const recorded = await courseNavigationService.recordCourseVisit(params.courseId, actor);
		if (!recorded) return apiError(404, 'course-not-found', 'This course does not exist.');
		return json({ recorded: true });
	});
