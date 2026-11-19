import { json } from '@sveltejs/kit';
import { postService } from '#lib/server/content/PostService.ts';
import {
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from '../../PostApiErrors.ts';
import type { RequestHandler } from './$types';

/** Locks the thread against new replies. The course's moderators and administrators only. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		await readApiJson(request);
		const post = await postService.setLocked(params.postId, true, locals.currentUser);
		return post ? json(post) : postNotFound();
	});

export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		requireSameOriginWrite(request);
		const post = await postService.setLocked(params.postId, false, locals.currentUser);
		return post ? json(post) : postNotFound();
	});
