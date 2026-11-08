import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { CourseCatalogService } from './CourseCatalogService.ts';
import { CourseRepository } from './CourseRepository.ts';
import { InstitutionRepository } from './InstitutionRepository.ts';
import { MembershipRepository } from './MembershipRepository.ts';
import { SpaceRepository } from './SpaceRepository.ts';

const administrator: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'administrator',
	role: 'administrator',
	status: 'active',
	profile: null
};

const newCourse = {
	institutionId: new ObjectId('000000000000000000000002'),
	code: ' cs   101 ',
	title: 'Introduction to Programming',
	description: 'Basics.'
};

function createService() {
	const courses = new CourseRepository();
	const spaces = new SpaceRepository();
	const service = new CourseCatalogService(
		new InstitutionRepository(),
		courses,
		spaces,
		new MembershipRepository()
	);
	return { service, courses, spaces };
}

function mockTransaction(): ClientSession {
	const session = {
		withTransaction: (operation: () => Promise<unknown>) => operation(),
		endSession: vi.fn().mockResolvedValue(undefined)
	} as unknown as ClientSession;
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(mongoClientProvider, 'startSession').mockReturnValue(session);
	return session;
}

afterEach(() => vi.restoreAllMocks());

describe('course catalog service', () => {
	it('creates a course together with its canonical space in one transaction', async () => {
		const { service, courses, spaces } = createService();
		const session = mockTransaction();
		vi.spyOn(courses, 'findIdByCode').mockResolvedValue(null);
		const insertSpace = vi.spyOn(spaces, 'insert').mockResolvedValue();
		const insertCourse = vi.spyOn(courses, 'insert').mockResolvedValue();

		const result = await service.createCourse(newCourse, administrator);

		const space = insertSpace.mock.calls[0][0];
		const course = insertCourse.mock.calls[0][0];
		expect(result).toEqual({ id: course._id, created: true });
		expect(space.courseId).toEqual(course._id);
		expect(course.spaceId).toEqual(space._id);
		expect(course).toMatchObject({ code: 'cs 101', normalizedCode: 'CS101' });
		expect(insertSpace.mock.calls[0][1]).toBe(session);
		expect(insertCourse.mock.calls[0][1]).toBe(session);
	});

	it('leaves an existing course with the same code unchanged', async () => {
		const { service, courses, spaces } = createService();
		mockTransaction();
		const existingCourseId = new ObjectId();
		vi.spyOn(courses, 'findIdByCode').mockResolvedValue(existingCourseId);
		const insertSpace = vi.spyOn(spaces, 'insert');

		expect(await service.createCourse(newCourse, administrator)).toEqual({
			id: existingCourseId,
			created: false
		});
		expect(insertSpace).not.toHaveBeenCalled();
	});

	it('lets only administrators change the catalog', async () => {
		const { service, spaces } = createService();
		const insertSpace = vi.spyOn(spaces, 'insert');
		const member = { ...administrator, role: 'member' as const };

		await expect(service.createCourse(newCourse, member)).rejects.toThrow();
		await expect(service.createInstitution('Example University', member)).rejects.toThrow();
		expect(insertSpace).not.toHaveBeenCalled();
	});
});
