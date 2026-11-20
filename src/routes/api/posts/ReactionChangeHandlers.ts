import type { RequestHandler } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { reactionService } from '#lib/server/content/ReactionService.ts';
import {
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import { toReactionChangeResponse } from './ReactionApiResponses.ts';

/** A post's reaction route has no `replyId`; a reply's has both ids. */
type ReactionTargetParams = { postId: string; replyId?: string; emoji: string };

/** Reacts to the post or reply with this emoji; repeating it changes nothing. */
export const addReactionHandler: RequestHandler<ReactionTargetParams> = ({
	locals,
	params,
	request
}) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		await readApiJson(request);
		return toReactionChangeResponse(
			await reactionService.addReaction(params.postId, params.replyId ?? null, params.emoji, actor)
		);
	});

/** Bodyless; HTML forms can't send DELETE, and cross-origin fetches need a CORS preflight. */
export const removeReactionHandler: RequestHandler<ReactionTargetParams> = ({
	locals,
	params,
	request
}) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		requireSameOriginWrite(request);
		return toReactionChangeResponse(
			await reactionService.removeReaction(
				params.postId,
				params.replyId ?? null,
				params.emoji,
				actor
			)
		);
	});
