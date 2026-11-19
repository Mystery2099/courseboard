import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import { CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { ApplicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import { CourseModeratorService } from './CourseModeratorService.ts';
import { ModeratorAssignmentRepository } from './ModeratorAssignmentRepository.ts';

const member: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'member',
	role: 'member',
	status: 'active',
	profile: null
};
const administrator: ApplicationUser = {
	...member,
	id: '000000000000000000000002',
	role: 'administrator'
};
const courseId = new ObjectId('000000000000000000000003');
const spaceId = new ObjectId('000000000000000000000004');
const moderatorId = new ObjectId('000000000000000000000005');
const assignmentId = new ObjectId('000000000000000000000006');

function createService() {
	const assignments = new ModeratorAssignmentRepository();
	const courses = new CourseRepository();
	const users = new ApplicationUserRepository();
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(courses, 'findSpaceId').mockResolvedValue(spaceId);
	vi.spyOn(users, 'findIdByUsername').mockResolvedValue(moderatorId);
	const insertIfAbsent = vi.spyOn(assignments, 'insertIfAbsent').mockResolvedValue(assignmentId);
	vi.spyOn(assignments, 'findSummaryById').mockResolvedValue({
		_id: assignmentId,
		assignedAt: new Date('2026-11-18T12:00:00Z'),
		course: { _id: courseId, code: 'CISY 8503', title: 'Applied Database', institutionName: 'ASC' },
		moderator: { username: 'r_santos', displayName: 'R Santos' }
	});
	return {
		service: new CourseModeratorService(assignments, courses, users),
		assignments,
		courses,
		users,
		insertIfAbsent
	};
}

afterEach(() => vi.restoreAllMocks());

describe('course moderator service', () => {
	it('lets only administrators manage moderators', async () => {
		const { service, insertIfAbsent } = createService();
		const input = { courseId: courseId.toHexString(), username: 'r_santos' };

		await expect(service.assignModerator(input, member)).rejects.toBeInstanceOf(AccessDeniedError);
		await expect(service.listAssignments(member)).rejects.toBeInstanceOf(AccessDeniedError);
		await expect(
			service.removeAssignment(assignmentId.toHexString(), member)
		).rejects.toBeInstanceOf(AccessDeniedError);
		expect(insertIfAbsent).not.toHaveBeenCalled();
	});

	it('assigns the named user to the course as the acting administrator', async () => {
		const { service, users, insertIfAbsent } = createService();

		const result = await service.assignModerator(
			{ courseId: courseId.toHexString(), username: ' @R_Santos ', assignedBy: member.id },
			administrator
		);

		expect(users.findIdByUsername).toHaveBeenCalledWith('r_santos');
		expect(insertIfAbsent).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: moderatorId,
				courseId,
				spaceId,
				assignedBy: new ObjectId(administrator.id)
			})
		);
		expect(result).toMatchObject({
			kind: 'assigned',
			assignment: { id: assignmentId.toHexString(), moderator: { username: 'r_santos' } }
		});
	});

	it('writes nothing for an unknown course or username', async () => {
		const { service, courses, users, insertIfAbsent } = createService();
		const input = { courseId: courseId.toHexString(), username: 'nobody' };

		vi.mocked(users.findIdByUsername).mockResolvedValueOnce(null);
		expect(await service.assignModerator(input, administrator)).toEqual({
			kind: 'user-not-found'
		});
		vi.mocked(courses.findSpaceId).mockResolvedValueOnce(null);
		expect(await service.assignModerator(input, administrator)).toEqual({
			kind: 'course-not-found'
		});
		expect(insertIfAbsent).not.toHaveBeenCalled();
	});
});
