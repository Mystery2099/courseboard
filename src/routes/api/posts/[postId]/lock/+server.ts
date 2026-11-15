import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { postService } from '#lib/server/content/PostService.ts';
import {
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from '../../PostApiErrors.ts';
import type { RequestHandler } from './$types';

/** Locks the thread against new replies. Administrators only until course moderators exist. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		await readApiJson(request);
		const post = await postService.setLocked(params.postId, true, actor);
		return post ? json(post) : postNotFound();
	});

export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		requireSameOriginWrite(request);
		const post = await postService.setLocked(params.postId, false, actor);
		return post ? json(post) : postNotFound();
	});
