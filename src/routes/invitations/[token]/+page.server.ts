import { error, fail, redirect } from '@sveltejs/kit';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import { invitationTokenSchema } from '#lib/server/admission/InvitationToken.ts';
import type { Actions, PageServerLoad } from './$types';

function parseToken(rawToken: string): string {
	const parsed = invitationTokenSchema.safeParse(rawToken);
	if (!parsed.success) error(404, 'This invitation link is not valid.');
	return parsed.data;
}

export const load: PageServerLoad = ({ locals, params }) => {
	parseToken(params.token);
	if (locals.currentUser) redirect(303, '/');
	return { isSignedIn: locals.auth().userId !== null };
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const token = parseToken(params.token);
		const { userId } = locals.auth();
		if (!userId) return fail(401, { message: 'Sign in before accepting the invitation.' });

		const result = await admissionService
			.redeemInvitation(token, userId)
			.catch((cause: unknown) => {
				if (cause instanceof AccessDeniedError) error(403, cause.message);
				throw cause;
			});
		if (result.kind === 'admitted' || result.kind === 'already-admitted') {
			redirect(303, '/');
		}
		if (result.kind === 'email-mismatch') {
			return fail(403, {
				message:
					'This invitation was sent to a different email address. Sign in with that address, or add and verify it in your account settings.'
			});
		}
		return fail(410, {
			message:
				'This invitation has expired, been revoked, or already been used. Ask an administrator for a new one.'
		});
	}
};
