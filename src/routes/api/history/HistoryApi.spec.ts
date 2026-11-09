import { afterEach, describe, expect, it, vi } from 'vitest';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { GET as listOwnHistory, POST as createEntry } from './+server.ts';
import { DELETE as deleteEntry, PUT as updateEntry } from './[entryId]/+server.ts';
import { GET as listVisibleHistory } from '../users/[username]/history/+server.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: null
};
const entryId = '000000000000000000000002';
const origin = 'https://example.test';

function requestEvent<Event>(user: ApplicationUser | null, request: Request, signedIn = true) {
	return {
		locals: { currentUser: user, auth: () => ({ userId: signedIn ? 'identity' : null }) },
		request,
		url: new URL(request.url),
		params: { entryId, username: 'alex_m' }
	} as unknown as Event;
}

function jsonRequest(method: string, path: string, body: unknown) {
	return new Request(`${origin}${path}`, {
		method,
		headers: { 'content-type': 'application/json', origin },
		body: JSON.stringify(body)
	});
}

afterEach(() => vi.restoreAllMocks());

describe('academic history HTTP API', () => {
	it.each([
		{ user: null, signedIn: false, status: 401 },
		{ user: null, signedIn: true, status: 403 },
		{ user: { ...student, status: 'suspended' as const }, signedIn: true, status: 403 }
	])('denies history reads and writes without active admission: $status', async (scenario) => {
		const listOwn = vi.spyOn(academicHistoryService, 'listOwnEntries');
		const listVisible = vi.spyOn(academicHistoryService, 'listVisibleEntries');
		const create = vi.spyOn(academicHistoryService, 'createEntry');
		const { user, signedIn } = scenario;

		const responses = await Promise.all([
			listOwnHistory(requestEvent(user, new Request(`${origin}/api/history`), signedIn)),
			listVisibleHistory(
				requestEvent(user, new Request(`${origin}/api/users/alex_m/history`), signedIn)
			),
			createEntry(
				requestEvent(
					user,
					jsonRequest('POST', '/api/history', { status: 'planning', term: null }),
					signedIn
				)
			)
		]);
		for (const response of responses) expect(response.status).toBe(scenario.status);
		expect(listOwn).not.toHaveBeenCalled();
		expect(listVisible).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it("answers someone else's entry exactly like a missing one", async () => {
		vi.spyOn(academicHistoryService, 'updateEntry').mockResolvedValue(null);
		vi.spyOn(academicHistoryService, 'deleteEntry').mockResolvedValue(false);
		const changes = { status: 'took', term: { season: 'fall', year: 2026 }, visibility: 'visible' };

		const update = await updateEntry(
			requestEvent(student, jsonRequest('PUT', `/api/history/${entryId}`, changes))
		);
		const remove = await deleteEntry(
			requestEvent(
				student,
				new Request(`${origin}/api/history/${entryId}`, { method: 'DELETE', headers: { origin } })
			)
		);

		for (const response of [update, remove]) {
			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({
				error: { code: 'entry-not-found', message: 'This history entry does not exist.' }
			});
		}
	});

	it('rejects a cross-origin delete before touching history', async () => {
		const remove = vi.spyOn(academicHistoryService, 'deleteEntry');
		const response = await deleteEntry(
			requestEvent(
				student,
				new Request(`${origin}/api/history/${entryId}`, {
					method: 'DELETE',
					headers: { origin: 'https://other.test' }
				})
			)
		);
		expect(response.status).toBe(403);
		expect(remove).not.toHaveBeenCalled();
	});

	it('rejects a term-less Taking entry as invalid input', async () => {
		const response = await createEntry(
			requestEvent(
				student,
				jsonRequest('POST', '/api/history', {
					courseId: '000000000000000000000003',
					status: 'taking',
					term: null
				})
			)
		);
		expect(response.status).toBe(400);
	});
});
