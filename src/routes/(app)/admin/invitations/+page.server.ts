import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import { determineInvitationStatus } from '#lib/server/admission/Invitation.ts';
import {
	invitationRepository,
	type InvitationSummary
} from '#lib/server/admission/InvitationRepository.ts';
import type { Actions, PageServerLoad } from './$types';

/** Safety ceiling; pending invitations expire after seven days, so this is not a page size. */
const PENDING_INVITATION_LIMIT = 1000;
const CLOSED_INVITATION_LIMIT = 50;

const createInvitationSchema = z.object({ email: z.email().max(254) });
const revokeInvitationSchema = z.object({ invitationId: z.string().regex(/^[a-f0-9]{24}$/) });

function toInvitationRow(invitation: InvitationSummary, now: Date) {
	return {
		id: invitation._id.toHexString(),
		email: invitation.email,
		createdAt: invitation.createdAt,
		expiresAt: invitation.expiresAt,
		status: determineInvitationStatus(invitation, now)
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	AccessGuard.requireAdministrator(locals);
	const now = new Date();
	const [pending, closed] = await Promise.all([
		invitationRepository.findPending(now, PENDING_INVITATION_LIMIT + 1),
		invitationRepository.findRecentClosed(now, CLOSED_INVITATION_LIMIT)
	]);
	return {
		pendingInvitations: pending
			.slice(0, PENDING_INVITATION_LIMIT)
			.map((invitation) => toInvitationRow(invitation, now)),
		hasMorePendingInvitations: pending.length > PENDING_INVITATION_LIMIT,
		closedInvitations: closed.map((invitation) => toInvitationRow(invitation, now))
	};
};

export const actions: Actions = {
	create: async ({ locals, request, url }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		const parsed = createInvitationSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { createError: 'Enter a valid email address.' });

		const invitation = await admissionService.createInvitation(parsed.data.email, administrator.id);
		return {
			createdInvitation: {
				email: invitation.email,
				expiresAt: invitation.expiresAt,
				link: new URL(`/invitations/${invitation.token}`, url.origin).toString()
			}
		};
	},
	revoke: async ({ locals, request }) => {
		AccessGuard.requireAdministrator(locals);
		const parsed = revokeInvitationSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { revokeError: 'Unknown invitation.' });

		const revoked = await admissionService.revokeInvitation(parsed.data.invitationId);
		if (!revoked) return fail(409, { revokeError: 'Only unused invitations can be revoked.' });
	}
};
