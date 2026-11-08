import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

/** Follows the course; repeating the request has no further effect. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		await readApiJson(request);
		const state = await courseFollowingService.followCourse(params.courseId, actor);
		if (!state) return apiError(404, 'course-not-found', 'This course does not exist.');
		return json(state);
	});

/** Bodyless; HTML forms can't send DELETE, and cross-origin fetches need a CORS preflight. */
export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		requireSameOriginWrite(request);
		const state = await courseFollowingService.unfollowCourse(params.courseId, actor);
		if (!state) return apiError(404, 'course-not-found', 'This course does not exist.');
		return json(state);
	});
