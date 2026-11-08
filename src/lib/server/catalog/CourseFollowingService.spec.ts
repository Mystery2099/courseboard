import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { CourseFollowingService } from './CourseFollowingService.ts';
import { CourseRepository } from './CourseRepository.ts';
import { MembershipRepository } from './MembershipRepository.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active'
};
const courseId = '000000000000000000000002';
const spaceId = new ObjectId('000000000000000000000003');

function createService() {
	const courses = new CourseRepository();
	const memberships = new MembershipRepository();
	return { service: new CourseFollowingService(courses, memberships), courses, memberships };
}

afterEach(() => vi.restoreAllMocks());

describe('course following service', () => {
	it('follows the course space for the acting user only', async () => {
		const { service, courses, memberships } = createService();
		vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
		vi.spyOn(courses, 'findSpaceId').mockResolvedValue(spaceId);
		const insert = vi.spyOn(memberships, 'insertIfAbsent').mockResolvedValue();

		expect(await service.followCourse(courseId, student)).toEqual({ isFollowed: true });
		expect(insert).toHaveBeenCalledWith(
			new ObjectId(student.id),
			spaceId,
			new ObjectId(courseId),
			expect.any(Date)
		);
	});

	it.each(['not-an-id', '000000000000000000000009'])(
		'reports an unknown or malformed course without writing: %s',
		async (unknownCourseId) => {
			const { service, courses, memberships } = createService();
			vi.spyOn(courses, 'findSpaceId').mockResolvedValue(null);
			const insert = vi.spyOn(memberships, 'insertIfAbsent');

			expect(await service.followCourse(unknownCourseId, student)).toBeNull();
			expect(insert).not.toHaveBeenCalled();
		}
	);

	it.each([null, { ...student, status: 'suspended' as const }])(
		'rejects accounts without active admission before accessing persistence: %j',
		async (actor) => {
			const { service, courses, memberships } = createService();
			const findSpaceId = vi.spyOn(courses, 'findSpaceId');
			const findFollowedCourses = vi.spyOn(memberships, 'findFollowedCourses');

			await expect(service.followCourse(courseId, actor)).rejects.toThrow();
			await expect(service.unfollowCourse(courseId, actor)).rejects.toThrow();
			await expect(service.listFollowedCourses(actor)).rejects.toThrow();
			expect(findSpaceId).not.toHaveBeenCalled();
			expect(findFollowedCourses).not.toHaveBeenCalled();
		}
	);
});
