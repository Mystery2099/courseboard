import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { createInvitationSchema, invitationIdSchema } from '#lib/contracts/InvitationContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import type { Actions, PageServerLoad } from './$types';

const revokeInvitationSchema = z.object({ invitationId: invitationIdSchema });

export const load: PageServerLoad = async ({ locals }) => {
	const administrator = AccessGuard.requireAdministrator(locals);
	return admissionService.listInvitations(administrator);
};

export const actions: Actions = {
	create: async ({ locals, request, url }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		const parsed = createInvitationSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { createError: 'Enter a valid email address.' });

		const invitation = await admissionService.createInvitation(parsed.data.email, administrator);
		return {
			createdInvitation: {
				email: invitation.email,
				expiresAt: invitation.expiresAt,
				link: new URL(`/invitations/${invitation.token}`, url.origin).toString()
			}
		};
	},
	revoke: async ({ locals, request }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		const parsed = revokeInvitationSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { revokeError: 'Unknown invitation.' });

		const revoked = await admissionService.revokeInvitation(parsed.data.invitationId, administrator);
		if (!revoked) return fail(409, { revokeError: 'Only unused invitations can be revoked.' });
	}
};
