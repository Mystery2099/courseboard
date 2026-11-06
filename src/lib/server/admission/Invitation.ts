import type { ObjectId } from 'mongodb';

export const INVITATIONS_COLLECTION_NAME = 'invitations';

export const INVITATION_VALIDITY_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

/**
 * A single-use application invitation. Only the SHA-256 hash of the link token is stored, so a
 * database read never reveals a usable link.
 */
export interface InvitationDocument {
	_id: ObjectId;
	/** Lowercased and trimmed; matched against the redeemer's verified Clerk email addresses. */
	email: string;
	tokenHash: string;
	createdByUserId: ObjectId;
	createdAt: Date;
	expiresAt: Date;
	revokedAt: Date | null;
	redeemedAt: Date | null;
	redeemedByClerkUserId: string | null;
}

export type InvitationStatus = 'pending' | 'redeemed' | 'revoked' | 'expired';

export function determineInvitationStatus(
	invitation: Pick<InvitationDocument, 'expiresAt' | 'revokedAt' | 'redeemedAt'>,
	now: Date
): InvitationStatus {
	if (invitation.redeemedAt) return 'redeemed';
	if (invitation.revokedAt) return 'revoked';
	if (invitation.expiresAt.getTime() <= now.getTime()) return 'expired';
	return 'pending';
}

export function normalizeEmailAddress(emailAddress: string): string {
	return emailAddress.trim().toLowerCase();
}
