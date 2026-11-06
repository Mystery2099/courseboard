import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const TOKEN_BYTE_LENGTH = 32;

/** 32 random bytes encoded as unpadded base64url. */
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export function generateInvitationToken(): string {
	return randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
}

export function hashInvitationToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
