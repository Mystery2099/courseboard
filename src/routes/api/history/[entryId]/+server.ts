import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity,
	requireSameOriginWrite
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

function entryNotFound(): Response {
	return apiError(404, 'entry-not-found', 'This history entry does not exist.');
}

/** Replaces the entry's status, term, visibility, and note. The course can't change. */
export const PUT: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const entry = await academicHistoryService.updateEntry(
			params.entryId,
			await readApiJson(request),
			actor
		);
		return entry ? json(entry) : entryNotFound();
	});

/** Bodyless; HTML forms can't send DELETE, and cross-origin fetches need a CORS preflight. */
export const DELETE: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		requireSameOriginWrite(request);
		const deleted = await academicHistoryService.deleteEntry(params.entryId, actor);
		return deleted ? new Response(null, { status: 204 }) : entryNotFound();
	});
