import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';

export class AccessDeniedError extends Error {
	constructor(
		readonly code: 'unauthenticated' | 'not-admitted' | 'suspended' | 'forbidden',
		message: string
	) {
		super(message);
	}
}

/** Transport-independent application permissions, shared by services and realtime. */
export class AccessPolicy {
	static requireAdmittedUser(user: ApplicationUser | null): ApplicationUser {
		if (!user) throw new AccessDeniedError('not-admitted', 'Application admission is required.');
		if (user.status !== 'active') {
			throw new AccessDeniedError('suspended', 'Your account is suspended.');
		}
		return user;
	}

	static requireAdministrator(user: ApplicationUser | null): ApplicationUser {
		const actor = this.requireAdmittedUser(user);
		if (actor.role !== 'administrator') {
			throw new AccessDeniedError('forbidden', 'Only administrators can do this.');
		}
		return actor;
	}

	static requireIdentity(clerkUserId: string | null): string {
		if (!clerkUserId) throw new AccessDeniedError('unauthenticated', 'Sign in first.');
		return clerkUserId;
	}
}
