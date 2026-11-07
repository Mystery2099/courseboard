import { json } from '@sveltejs/kit';
import { createInvitationSchema } from '#lib/contracts/InvitationContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import { apiResponse, readApiJson, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		return json(await admissionService.listInvitations(locals.currentUser));
	});

export const POST: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		const input = createInvitationSchema.parse(await readApiJson(request));
		return json(await admissionService.createInvitation(input.email, actor), { status: 201 });
	});
