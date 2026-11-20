import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { reactionService } from '#lib/server/content/ReactionService.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import { toThreadReactionsResponse } from '../../ReactionApiResponses.ts';
import type { RequestHandler } from './$types';

/** Reaction counts for the post and every reply in its thread. */
export const GET: RequestHandler = ({ locals, params }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		return toThreadReactionsResponse(
			await reactionService.listThreadReactions(params.postId, actor)
		);
	});
