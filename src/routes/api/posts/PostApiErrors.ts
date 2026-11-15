import { apiError } from '#lib/server/http/ApiResponse.ts';

export function postNotFound(): Response {
	return apiError(404, 'post-not-found', 'This post does not exist.');
}
