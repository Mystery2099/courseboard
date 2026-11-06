import { ObjectId } from 'mongodb';
import { clerkClient } from 'svelte-clerk/server';
import { BOOTSTRAP_ADMINISTRATOR_CLERK_USER_ID } from '$app/env/private';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from '#lib/server/users/ApplicationUserRepository.ts';
import {
	INVITATION_VALIDITY_MILLISECONDS,
	determineInvitationStatus,
	normalizeEmailAddress
} from './Invitation.ts';
import { invitationRepository, type InvitationRepository } from './InvitationRepository.ts';
import { generateInvitationToken, hashInvitationToken } from './InvitationToken.ts';

export type RedemptionResult =
	| { kind: 'admitted' }
	| { kind: 'already-admitted' }
	| { kind: 'email-mismatch' }
	| { kind: 'unavailable' };

/**
 * Decides who may use the application. A Clerk account alone grants nothing: admission requires
 * redeeming an invitation whose email matches one of the account's verified Clerk email
 * addresses, except for the configured bootstrap administrator.
 */
export class AdmissionService {
	constructor(
		private readonly users: ApplicationUserRepository,
		private readonly invitations: InvitationRepository
	) {}

	/** Returns the admitted user for a Clerk identity, admitting the bootstrap administrator. */
	async resolveCurrentUser(clerkUserId: string): Promise<ApplicationUser | null> {
		const user = await this.users.findByClerkUserId(clerkUserId);
		if (user || clerkUserId !== BOOTSTRAP_ADMINISTRATOR_CLERK_USER_ID) return user;
		await this.users.insertIfAbsent(clerkUserId, 'administrator', new Date());
		return this.users.findByClerkUserId(clerkUserId);
	}

	async createInvitation(
		emailAddress: string,
		createdByUserId: string
	): Promise<{ token: string; email: string; expiresAt: Date }> {
		const token = generateInvitationToken();
		const now = new Date();
		const email = normalizeEmailAddress(emailAddress);
		const expiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MILLISECONDS);
		await this.invitations.insert({
			email,
			tokenHash: hashInvitationToken(token),
			createdByUserId: new ObjectId(createdByUserId),
			createdAt: now,
			expiresAt,
			revokedAt: null,
			redeemedAt: null,
			redeemedByClerkUserId: null
		});
		return { token, email, expiresAt };
	}

	revokeInvitation(invitationId: string): Promise<boolean> {
		return this.invitations.revoke(new ObjectId(invitationId), new Date());
	}

	/**
	 * Claims the invitation and creates the user in one transaction, so an invitation is never
	 * consumed without admitting someone and a user is never admitted twice.
	 */
	async redeemInvitation(token: string, clerkUserId: string): Promise<RedemptionResult> {
		const verifiedEmails = await this.findVerifiedEmailAddresses(clerkUserId);
		const tokenHash = hashInvitationToken(token);
		const session = mongoClientProvider.startSession();
		try {
			return await session.withTransaction(async () => {
				if (await this.users.findByClerkUserId(clerkUserId, session)) {
					return { kind: 'already-admitted' } as const;
				}
				const now = new Date();
				const claimed = await this.invitations.claim(
					tokenHash,
					verifiedEmails,
					clerkUserId,
					now,
					session
				);
				if (!claimed) {
					const invitation = await this.invitations.findByTokenHash(tokenHash, session);
					const isPending = invitation && determineInvitationStatus(invitation, now) === 'pending';
					return { kind: isPending ? 'email-mismatch' : 'unavailable' } as const;
				}
				await this.users.insert(clerkUserId, 'member', claimed._id, now, session);
				return { kind: 'admitted' } as const;
			});
		} finally {
			await session.endSession();
		}
	}

	private async findVerifiedEmailAddresses(clerkUserId: string): Promise<string[]> {
		const clerkUser = await clerkClient.users.getUser(clerkUserId);
		return clerkUser.emailAddresses
			.filter((emailAddress) => emailAddress.verification?.status === 'verified')
			.map((emailAddress) => normalizeEmailAddress(emailAddress.emailAddress));
	}
}

export const admissionService = new AdmissionService(
	applicationUserRepository,
	invitationRepository
);
