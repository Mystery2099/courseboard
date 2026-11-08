import { json } from '@sveltejs/kit';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { apiError, apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const course = await courseCatalogService.getCourse(params.courseId, locals.currentUser);
		if (!course) return apiError(404, 'course-not-found', 'This course does not exist.');
		return json(course);
	});
