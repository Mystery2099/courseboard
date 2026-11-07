import { ObjectId } from 'mongodb';
import {
	createInvitationSchema,
	invitationIdSchema,
	invitationTokenSchema,
	type CreatedInvitationResponse,
	type InvitationListResponse,
	type RedemptionResult
} from '#lib/contracts/InvitationContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { clerkClient } from 'svelte-clerk/server';
import { BOOTSTRAP_ADMINISTRATOR_CLERK_USER_ID } from '$app/env/private';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
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
import {
	invitationRepository,
	type InvitationRepository,
	type InvitationSummary
} from './InvitationRepository.ts';
import { generateInvitationToken, hashInvitationToken } from './InvitationToken.ts';

/**
 * Decides who may use the application. A Clerk account alone grants nothing: admission requires
 * redeeming an invitation whose email matches one of the account's verified Clerk email
 * addresses, except for the configured bootstrap administrator.
 */
export class AdmissionService {
	private static readonly PENDING_INVITATION_LIMIT = 1000;
	private static readonly CLOSED_INVITATION_LIMIT = 50;

	constructor(
		private readonly users: ApplicationUserRepository,
		private readonly invitations: InvitationRepository
	) {}

	/** Returns the admitted user for a Clerk identity, admitting the bootstrap administrator. */
	async resolveCurrentUser(clerkUserId: string): Promise<ApplicationUser | null> {
		const user = await this.users.findByClerkUserId(clerkUserId);
		if (user || clerkUserId !== BOOTSTRAP_ADMINISTRATOR_CLERK_USER_ID) return user;
		await DatabaseIndexInitializer.ensureIndexes();
		await this.users.insertIfAbsent(clerkUserId, 'administrator', new Date());
		return this.users.findByClerkUserId(clerkUserId);
	}

	async createInvitation(
		emailAddress: string,
		actor: ApplicationUser | null
	): Promise<CreatedInvitationResponse> {
		const administrator = AccessPolicy.requireAdministrator(actor);
		const input = createInvitationSchema.parse({ email: emailAddress });
		const token = generateInvitationToken();
		const now = new Date();
		const email = normalizeEmailAddress(input.email);
		const expiresAt = new Date(now.getTime() + INVITATION_VALIDITY_MILLISECONDS);
		await this.invitations.insert({
			email,
			tokenHash: hashInvitationToken(token),
			createdByUserId: new ObjectId(administrator.id),
			createdAt: now,
			expiresAt,
			revokedAt: null,
			redeemedAt: null,
			redeemedByClerkUserId: null
		});
		return { token, email, expiresAt: expiresAt.toISOString() };
	}

	revokeInvitation(invitationId: string, actor: ApplicationUser | null): Promise<boolean> {
		AccessPolicy.requireAdministrator(actor);
		return this.invitations.revoke(
			new ObjectId(invitationIdSchema.parse(invitationId)),
			new Date()
		);
	}

	async listInvitations(actor: ApplicationUser | null): Promise<InvitationListResponse> {
		AccessPolicy.requireAdministrator(actor);
		const now = new Date();
		const [pending, closed] = await Promise.all([
			this.invitations.findPending(now, AdmissionService.PENDING_INVITATION_LIMIT + 1),
			this.invitations.findRecentClosed(now, AdmissionService.CLOSED_INVITATION_LIMIT)
		]);
		const toSummary = (invitation: InvitationSummary) => ({
			id: invitation._id.toHexString(),
			email: invitation.email,
			createdAt: invitation.createdAt.toISOString(),
			expiresAt: invitation.expiresAt.toISOString(),
			status: determineInvitationStatus(invitation, now)
		});
		return {
			pendingInvitations: pending
				.slice(0, AdmissionService.PENDING_INVITATION_LIMIT)
				.map(toSummary),
			hasMorePendingInvitations: pending.length > AdmissionService.PENDING_INVITATION_LIMIT,
			closedInvitations: closed.map(toSummary)
		};
	}

	/**
	 * Claims the invitation and creates the user in one transaction, so an invitation is never
	 * consumed without admitting someone and a user is never admitted twice. Transactions require a
	 * replica set or sharded cluster; Atlas clusters are replica sets.
	 */
	async redeemInvitation(token: string, identity: string | null): Promise<RedemptionResult> {
		const clerkUserId = AccessPolicy.requireIdentity(identity);
		invitationTokenSchema.parse(token);
		const verifiedEmails = await this.findVerifiedEmailAddresses(clerkUserId);
		const tokenHash = hashInvitationToken(token);
		// The unique clerkUserId index is what prevents concurrent redemptions from admitting twice.
		await DatabaseIndexInitializer.ensureIndexes();
		const session = mongoClientProvider.startSession();
		try {
			return await session.withTransaction(async () => {
				const existingUser = await this.users.findByClerkUserId(clerkUserId, session);
				if (existingUser) {
					AccessPolicy.requireAdmittedUser(existingUser);
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
