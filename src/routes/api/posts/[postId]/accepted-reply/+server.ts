import { json } from '@sveltejs/kit';
import type { AcceptedReplyChangeResult } from '#lib/contracts/PostContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { postService } from '#lib/server/content/PostService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from '../../PostApiErrors.ts';
import type { RequestHandler } from './$types';

function toResponse(result: AcceptedReplyChangeResult): Response {
	switch (result.kind) {
		case 'changed':
			return json(result.post);
		case 'post-not-found':
			return postNotFound();
		case 'not-a-question':
			return apiError(409, 'not-a-question', 'Only questions have an accepted reply.');
		case 'reply-not-found':
			return apiError(404, 'reply-not-found', 'This reply does not belong to the question.');
	}
}

/** Chooses or replaces the accepted reply. Only the question's author may. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		return toResponse(
			await postService.chooseAcceptedReply(params.postId, await readApiJson(request), actor)
		);
	});

export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		requireSameOriginWrite(request);
		return toResponse(await postService.clearAcceptedReply(params.postId, actor));
	});
