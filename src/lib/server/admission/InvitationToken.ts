import { createHash, randomBytes } from 'node:crypto';
export { invitationTokenSchema } from '#lib/contracts/InvitationContract.ts';

const TOKEN_BYTE_LENGTH = 32;

export function generateInvitationToken(): string {
	return randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
}

export function hashInvitationToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
