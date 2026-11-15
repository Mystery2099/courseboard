import { error, fail, redirect } from '@sveltejs/kit';
import type { ErrorCode } from '#lib/contracts/ErrorContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import { invitationTokenSchema } from '#lib/server/admission/InvitationToken.ts';
import type { Actions, PageServerLoad } from './$types';

function parseToken(rawToken: string): string {
	const parsed = invitationTokenSchema.safeParse(rawToken);
	if (!parsed.success) {
		error(404, { code: 'invitation-link-invalid', message: 'This invitation link is not valid.' });
	}
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
		if (!userId) return fail(401, { errorCode: 'unauthenticated' satisfies ErrorCode });

		const result = await admissionService
			.redeemInvitation(token, userId)
			.catch((cause: unknown) => {
				if (cause instanceof AccessDeniedError) AccessGuard.deny(cause);
				throw cause;
			});
		if (result.kind === 'admitted' || result.kind === 'already-admitted') {
			redirect(303, '/');
		}
		if (result.kind === 'email-mismatch') {
			return fail(403, { errorCode: 'email-mismatch' satisfies ErrorCode });
		}
		return fail(410, { errorCode: 'invitation-unavailable' satisfies ErrorCode });
	}
};
