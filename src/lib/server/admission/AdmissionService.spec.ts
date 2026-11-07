import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { ApplicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import { AdmissionService } from './AdmissionService.ts';
import { InvitationRepository } from './InvitationRepository.ts';

vi.mock('svelte-clerk/server', () => ({ clerkClient: { users: { getUser: vi.fn() } } }));

const administrator: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'administrator',
	role: 'administrator',
	status: 'active'
};

afterEach(() => vi.restoreAllMocks());

describe('invitation service boundary', () => {
	it.each([
		null,
		{ ...administrator, role: 'member' as const },
		{ ...administrator, status: 'suspended' as const }
	])('rejects unauthorized administration before accessing persistence: %j', async (actor) => {
		const invitations = new InvitationRepository();
		const insert = vi.spyOn(invitations, 'insert');
		const revoke = vi.spyOn(invitations, 'revoke');
		const findPending = vi.spyOn(invitations, 'findPending');
		const service = new AdmissionService(new ApplicationUserRepository(), invitations);

		await expect(service.createInvitation('student@example.edu', actor)).rejects.toThrow();
		expect(() => service.revokeInvitation(administrator.id, actor)).toThrow();
		await expect(service.listInvitations(actor)).rejects.toThrow();
		expect(insert).not.toHaveBeenCalled();
		expect(revoke).not.toHaveBeenCalled();
		expect(findPending).not.toHaveBeenCalled();
	});

	it('returns serialized listing fields without persistence internals', async () => {
		const invitations = new InvitationRepository();
		const createdAt = new Date('2026-11-07T12:00:00Z');
		const expiresAt = new Date('2099-11-14T12:00:00Z');
		vi.spyOn(invitations, 'findPending').mockResolvedValue([{
			_id: new ObjectId(administrator.id), email: 'student@example.edu',
			createdAt, expiresAt, revokedAt: null, redeemedAt: null
		}]);
		vi.spyOn(invitations, 'findRecentClosed').mockResolvedValue([]);
		const service = new AdmissionService(new ApplicationUserRepository(), invitations);

		expect(await service.listInvitations(administrator)).toEqual({
			pendingInvitations: [{ id: administrator.id, email: 'student@example.edu',
				createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(), status: 'pending' }],
			hasMorePendingInvitations: false,
			closedInvitations: []
		});
	});

	it('requires a signed-in identity before redeeming', async () => {
		const service = new AdmissionService(new ApplicationUserRepository(), new InvitationRepository());
		await expect(service.redeemInvitation('a'.repeat(43), null)).rejects.toThrow('Sign in first.');
	});
});
