import { error, redirect } from '@sveltejs/kit';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { AccessDeniedError, AccessPolicy } from './AccessPolicy.ts';

/**
 * Server-side access checks. Layout loads do not run for `+server.ts` endpoints or form actions,
 * so every endpoint and action must call these itself.
 */
export class AccessGuard {
	/** Requires a signed-in, admitted, active account. */
	static requireAdmittedUser(locals: App.Locals): ApplicationUser {
		if (!locals.currentUser) redirect(303, '/');
		try {
			return AccessPolicy.requireAdmittedUser(locals.currentUser);
		} catch (cause) {
			if (cause instanceof AccessDeniedError) error(403, cause.message);
			throw cause;
		}
	}

	static requireAdministrator(locals: App.Locals): ApplicationUser {
		const user = AccessGuard.requireAdmittedUser(locals);
		try {
			return AccessPolicy.requireAdministrator(user);
		} catch (cause) {
			if (cause instanceof AccessDeniedError) error(403, cause.message);
			throw cause;
		}
	}
}
