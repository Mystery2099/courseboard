import { json } from '@sveltejs/kit';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		return json(await courseFollowingService.listFollowedCourses(locals.currentUser));
	});
