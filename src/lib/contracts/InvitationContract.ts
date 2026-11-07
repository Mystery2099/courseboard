import { z } from 'zod';

export const createInvitationSchema = z.object({ email: z.email().max(254) });
export const invitationIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
/** 32 random bytes encoded as unpadded base64url. */
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const redeemInvitationSchema = z.object({ token: invitationTokenSchema });

export type RedemptionResult =
	| { kind: 'admitted' }
	| { kind: 'already-admitted' }
	| { kind: 'email-mismatch' }
	| { kind: 'unavailable' };

export interface ApiErrorResponse {
	error: { code: string; message: string };
}

export interface InvitationSummaryResponse {
	id: string;
	email: string;
	createdAt: string;
	expiresAt: string;
	status: 'pending' | 'expired' | 'revoked' | 'redeemed';
}

export interface InvitationListResponse {
	pendingInvitations: InvitationSummaryResponse[];
	hasMorePendingInvitations: boolean;
	closedInvitations: InvitationSummaryResponse[];
}

export interface CreatedInvitationResponse {
	token: string;
	email: string;
	expiresAt: string;
}
