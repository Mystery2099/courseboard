import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { reviewService } from '#lib/server/content/ReviewService.ts';
import {
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from '../../PostApiErrors.ts';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const post = await reviewService.updateReview(params.postId, await readApiJson(request), actor);
		return post ? json(post) : postNotFound();
	});
