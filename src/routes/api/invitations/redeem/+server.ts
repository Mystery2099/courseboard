import { json } from '@sveltejs/kit';
import { redeemInvitationSchema } from '#lib/contracts/InvitationContract.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		const identity = requireApiIdentity(locals);
		const input = redeemInvitationSchema.parse(await readApiJson(request));
		const result = await admissionService.redeemInvitation(input.token, identity);
		if (result.kind === 'email-mismatch') {
			return apiError(403, 'email-mismatch', 'Verify the invited email address before redeeming.');
		}
		if (result.kind === 'unavailable') {
			return apiError(410, 'invitation-unavailable', 'This invitation is no longer available.');
		}
		return json(result);
	});
