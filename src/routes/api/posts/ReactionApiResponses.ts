import { json } from '@sveltejs/kit';
import type {
	ReactionChangeResult,
	ThreadReactionsResult
} from '#lib/contracts/ReactionContract.ts';
import { apiError } from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from './PostApiErrors.ts';

function reactionsNotAllowed(): Response {
	return apiError(409, 'reactions-not-allowed', 'Review threads do not take reactions.');
}

export function toThreadReactionsResponse(result: ThreadReactionsResult): Response {
	switch (result.kind) {
		case 'found':
			return json(result.reactions);
		case 'post-not-found':
			return postNotFound();
		case 'reactions-not-allowed':
			return reactionsNotAllowed();
	}
}

export function toReactionChangeResponse(result: ReactionChangeResult): Response {
	switch (result.kind) {
		case 'saved':
			return new Response(null, { status: 204 });
		case 'post-not-found':
			return postNotFound();
		case 'reply-not-found':
			return apiError(404, 'reply-not-found', 'This reply does not belong to the post.');
		case 'reactions-not-allowed':
			return reactionsNotAllowed();
	}
}
