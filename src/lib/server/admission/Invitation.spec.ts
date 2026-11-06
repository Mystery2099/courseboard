import { describe, expect, it } from 'vitest';
import {
	INVITATION_VALIDITY_MILLISECONDS,
	determineInvitationStatus,
	normalizeEmailAddress
} from './Invitation.ts';
import {
	generateInvitationToken,
	hashInvitationToken,
	invitationTokenSchema
} from './InvitationToken.ts';

const NOW = new Date('2026-11-06T12:00:00Z');
const FUTURE = new Date(NOW.getTime() + INVITATION_VALIDITY_MILLISECONDS);
const PAST = new Date(NOW.getTime() - 1);

describe('determineInvitationStatus', () => {
	it('is pending when unused, unrevoked, and unexpired', () => {
		expect(
			determineInvitationStatus({ expiresAt: FUTURE, revokedAt: null, redeemedAt: null }, NOW)
		).toBe('pending');
	});

	it('is expired at exactly the expiry time', () => {
		expect(
			determineInvitationStatus({ expiresAt: NOW, revokedAt: null, redeemedAt: null }, NOW)
		).toBe('expired');
	});

	it('reports redemption ahead of revocation and expiry', () => {
		expect(
			determineInvitationStatus({ expiresAt: PAST, revokedAt: PAST, redeemedAt: PAST }, NOW)
		).toBe('redeemed');
	});

	it('reports revocation ahead of expiry', () => {
		expect(
			determineInvitationStatus({ expiresAt: PAST, revokedAt: PAST, redeemedAt: null }, NOW)
		).toBe('revoked');
	});
});

describe('normalizeEmailAddress', () => {
	it('trims and lowercases', () => {
		expect(normalizeEmailAddress('  Student@Example.EDU ')).toBe('student@example.edu');
	});
});

describe('invitation tokens', () => {
	it('generates distinct tokens that match the link schema', () => {
		const first = generateInvitationToken();
		const second = generateInvitationToken();
		expect(first).not.toBe(second);
		expect(invitationTokenSchema.safeParse(first).success).toBe(true);
	});

	it('rejects malformed tokens', () => {
		expect(invitationTokenSchema.safeParse('short').success).toBe(false);
		expect(invitationTokenSchema.safeParse(`${generateInvitationToken()}=`).success).toBe(false);
	});

	it('hashes deterministically without containing the token', () => {
		const token = generateInvitationToken();
		const hash = hashInvitationToken(token);
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
		expect(hash).toBe(hashInvitationToken(token));
		expect(hash).not.toContain(token);
	});
});
