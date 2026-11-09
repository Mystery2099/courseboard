import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

/** The current user's own history, including private entries and notes. */
export const GET: RequestHandler = ({ locals }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		return json(await academicHistoryService.listOwnEntries(actor));
	});

export const POST: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const result = await academicHistoryService.createEntry(await readApiJson(request), actor);
		switch (result.kind) {
			case 'created':
				return json(result.entry, { status: 201 });
			case 'course-not-found':
				return apiError(404, 'course-not-found', 'This course does not exist.');
			case 'entry-limit-reached':
				return apiError(409, 'entry-limit-reached', 'Your history has reached its entry limit.');
		}
	});
