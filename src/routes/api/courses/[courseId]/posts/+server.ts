import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { postService } from '#lib/server/content/PostService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

function courseNotFound(): Response {
	return apiError(404, 'course-not-found', 'This course does not exist.');
}

/** One page of the course's questions and discussions, without their bodies. */
export const GET: RequestHandler = ({ locals, params, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const page = await postService.listPosts(
			params.courseId,
			Object.fromEntries(url.searchParams),
			actor
		);
		return page ? json(page) : courseNotFound();
	});

export const POST: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const result = await postService.createPost(
			params.courseId,
			await readApiJson(request),
			actor
		);
		return result.kind === 'created' ? json(result.post, { status: 201 }) : courseNotFound();
	});
