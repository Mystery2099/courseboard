import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { postService } from '#lib/server/content/PostService.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from '../PostApiErrors.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const post = await postService.getPost(params.postId, actor);
		return post ? json(post) : postNotFound();
	});
