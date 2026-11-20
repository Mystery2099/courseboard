import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { reactionService } from '#lib/server/content/ReactionService.ts';
import {
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import { toReactionChangeResponse } from '../../../../../ReactionApiResponses.ts';
import type { RequestHandler } from './$types';

/** Reacts to the reply with this emoji; repeating it changes nothing. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		await readApiJson(request);
		return toReactionChangeResponse(
			await reactionService.addReaction(params.postId, params.replyId, params.emoji, actor)
		);
	});

/** Bodyless; HTML forms can't send DELETE, and cross-origin fetches need a CORS preflight. */
export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		requireSameOriginWrite(request);
		return toReactionChangeResponse(
			await reactionService.removeReaction(params.postId, params.replyId, params.emoji, actor)
		);
	});
