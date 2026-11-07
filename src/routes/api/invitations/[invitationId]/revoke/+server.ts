import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		await readApiJson(request);
		const revoked = await admissionService.revokeInvitation(params.invitationId, actor);
		if (!revoked)
			return apiError(409, 'invitation-unavailable', 'This invitation cannot be revoked.');
		return json({ revoked: true });
	});
