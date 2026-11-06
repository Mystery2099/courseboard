import { error, redirect } from '@sveltejs/kit';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';

/**
 * Server-side access checks. Layout loads do not run for `+server.ts` endpoints or form actions,
 * so every endpoint and action must call these itself.
 */
export class AccessGuard {
	/** Requires a signed-in, admitted, active account. */
	static requireAdmittedUser(locals: App.Locals): ApplicationUser {
		const user = locals.currentUser;
		if (!user) redirect(303, '/');
		if (user.status !== 'active') error(403, 'Your account is suspended.');
		return user;
	}

	static requireAdministrator(locals: App.Locals): ApplicationUser {
		const user = AccessGuard.requireAdmittedUser(locals);
		if (user.role !== 'administrator') error(403, 'Only administrators can do this.');
		return user;
	}
}
