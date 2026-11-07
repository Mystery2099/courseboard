import { afterEach, describe, expect, it, vi } from 'vitest';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { GET, POST } from './+server.ts';
import { POST as revokeInvitation } from './[invitationId]/revoke/+server.ts';
import { POST as redeemInvitation } from './redeem/+server.ts';

vi.mock('svelte-clerk/server', () => ({ clerkClient: { users: { getUser: vi.fn() } } }));

const administrator: ApplicationUser = {
	id: '000000000000000000000001', clerkUserId: 'administrator',
	role: 'administrator', status: 'active'
};

function requestEvent(user: ApplicationUser | null, request?: Request, signedIn = true) {
	return {
		locals: { currentUser: user, auth: () => ({ userId: signedIn ? 'identity' : null }) },
		request: request ?? new Request('https://example.test/api/invitations'),
		params: { invitationId: administrator.id }
	} as unknown as Parameters<typeof GET>[0];
}

function jsonRequest(body: string, origin = 'https://example.test') {
	return new Request('https://example.test/api/invitations', {
		method: 'POST', headers: { 'content-type': 'application/json', origin }, body
	});
}

afterEach(() => vi.restoreAllMocks());

describe('invitation HTTP API', () => {
	it.each([
		{ user: null, signedIn: false, status: 401 },
		{ user: null, signedIn: true, status: 403 },
		{ user: { ...administrator, role: 'member' as const }, signedIn: true, status: 403 },
		{ user: { ...administrator, status: 'suspended' as const }, signedIn: true, status: 403 }
	])('returns JSON rather than redirects for denied access: $status', async ({ user, signedIn, status }) => {
		const response = await GET(requestEvent(user, undefined, signedIn));
		expect(response.status).toBe(status);
		expect(response.headers.get('location')).toBeNull();
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toHaveProperty('error.code');
	});

	it('creates an invitation through the same service used by web actions', async () => {
		const result = { token: 'a'.repeat(43), email: 'student@example.edu', expiresAt: '2026-11-14T12:00:00.000Z' };
		const create = vi.spyOn(admissionService, 'createInvitation').mockResolvedValue(result);
		const response = await POST(requestEvent(administrator, jsonRequest('{"email":"student@example.edu"}')));
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual(result);
		expect(create).toHaveBeenCalledWith('student@example.edu', administrator);
	});

	it.each([
		{ request: jsonRequest('{'), status: 400 },
		{ request: jsonRequest('{"email":"invalid"}'), status: 400 },
		{ request: jsonRequest('{}', 'https://other.test'), status: 403 },
		{ request: new Request('https://example.test/api/invitations', { method: 'POST', body: 'email=test' }), status: 415 }
	])('rejects invalid write requests before calling the service: $status', async ({ request, status }) => {
		const create = vi.spyOn(admissionService, 'createInvitation');
		const response = await POST(requestEvent(administrator, request));
		expect(response.status).toBe(status);
		expect(create).not.toHaveBeenCalled();
	});

	it('reports a revocation conflict', async () => {
		vi.spyOn(admissionService, 'revokeInvitation').mockResolvedValue(false);
		const response = await revokeInvitation(requestEvent(administrator, jsonRequest('{}')));
		expect(response.status).toBe(409);
	});

	it.each([
		{ kind: 'admitted' as const, status: 200 },
		{ kind: 'email-mismatch' as const, status: 403 },
		{ kind: 'unavailable' as const, status: 410 }
	])('allows signed-in, unadmitted identities to redeem: $kind', async ({ kind, status }) => {
		const redeem = vi.spyOn(admissionService, 'redeemInvitation').mockResolvedValue({ kind });
		const response = await redeemInvitation(requestEvent(null, jsonRequest(JSON.stringify({ token: 'a'.repeat(43) }))));
		expect(response.status).toBe(status);
		expect(redeem).toHaveBeenCalledWith('a'.repeat(43), 'identity');
	});
});
