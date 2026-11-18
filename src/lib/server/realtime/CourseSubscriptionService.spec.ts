import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { ApplicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import { CourseSubscriptionService } from './CourseSubscriptionService.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: null
};
const courseId = '000000000000000000000003';

function createService(storedUser: ApplicationUser | null, spaceId: ObjectId | null) {
	const users = new ApplicationUserRepository();
	const courses = new CourseRepository();
	vi.spyOn(users, 'findByClerkUserId').mockResolvedValue(storedUser);
	const findSpaceId = vi.spyOn(courses, 'findSpaceId').mockResolvedValue(spaceId);
	return { service: new CourseSubscriptionService(users, courses), findSpaceId };
}

afterEach(() => vi.restoreAllMocks());

describe('course subscription service', () => {
	it('allows an admitted account to hear an existing course', async () => {
		const { service } = createService(student, new ObjectId());

		expect(await service.authorize('student', { courseId })).toEqual({ kind: 'allowed', courseId });
	});

	it.each([
		{ scenario: 'a malformed course id', user: student, request: { courseId: 'room:admin' } },
		{ scenario: 'an account without admission', user: null, request: { courseId } },
		{
			scenario: 'an account suspended after connecting',
			user: { ...student, status: 'suspended' as const },
			request: { courseId }
		}
	])('refuses $scenario before looking up the course', async ({ user, request }) => {
		const { service, findSpaceId } = createService(user, new ObjectId());

		expect(await service.authorize('student', request)).toMatchObject({ kind: 'refused' });
		expect(findSpaceId).not.toHaveBeenCalled();
	});

	it('refuses a course that does not exist', async () => {
		const { service } = createService(student, null);

		expect(await service.authorize('student', { courseId })).toEqual({
			kind: 'refused',
			reason: 'course-not-found'
		});
	});
});
