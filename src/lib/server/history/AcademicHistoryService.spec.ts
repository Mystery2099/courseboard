import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { ApplicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import type { OwnHistoryEntry } from './AcademicHistoryEntry.ts';
import { AcademicHistoryRepository } from './AcademicHistoryRepository.ts';
import { AcademicHistoryService } from './AcademicHistoryService.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: null
};
const courseId = new ObjectId('000000000000000000000002');
const entryId = new ObjectId('000000000000000000000003');
const course = {
	courseId,
	code: 'CISY 8503',
	title: 'Applied Database Management',
	institutionId: new ObjectId('000000000000000000000004'),
	institutionName: 'Alfred State College'
};
const storedEntry: OwnHistoryEntry = {
	_id: entryId,
	course,
	status: 'taking',
	term: { season: 'fall', year: 2026 },
	visibility: 'private',
	privateNote: 'Ask about the lab rubric.'
};

function createService() {
	const entries = new AcademicHistoryRepository();
	const courses = new CourseRepository();
	const users = new ApplicationUserRepository();
	vi.spyOn(courses, 'findById').mockResolvedValue({
		_id: courseId,
		code: course.code,
		normalizedCode: 'CISY8503',
		title: course.title,
		institutionId: course.institutionId,
		description: '',
		spaceId: new ObjectId('000000000000000000000006')
	});
	vi.spyOn(entries, 'countByUser').mockResolvedValue(0);
	vi.spyOn(entries, 'findOwnEntry').mockResolvedValue(storedEntry);
	return { service: new AcademicHistoryService(entries, courses, users), entries, courses, users };
}

afterEach(() => vi.restoreAllMocks());

describe('academic history service', () => {
	it('records a private entry for the acting user only', async () => {
		const { service, entries } = createService();
		const insert = vi.spyOn(entries, 'insert').mockResolvedValue();

		const result = await service.createEntry(
			{
				courseId: courseId.toHexString(),
				status: 'taking',
				term: { season: 'fall', year: 2026 },
				userId: '000000000000000000000009'
			},
			student
		);

		expect(result.kind).toBe('created');
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: new ObjectId(student.id),
				courseId,
				visibility: 'private',
				privateNote: ''
			})
		);
	});

	it.each([
		{ status: 'planning', term: null, isValid: true },
		{ status: 'taking', term: null, isValid: false },
		{ status: 'took', term: null, isValid: false },
		{ status: 'took', term: { season: 'spring', year: 2025 }, isValid: true }
	])('requires a term unless planning: $status', async ({ status, term, isValid }) => {
		const { service, entries } = createService();
		const insert = vi.spyOn(entries, 'insert').mockResolvedValue();
		const create = service.createEntry({ courseId: courseId.toHexString(), status, term }, student);

		if (isValid) await expect(create).resolves.toMatchObject({ kind: 'created' });
		else await expect(create).rejects.toThrow();
		expect(insert).toHaveBeenCalledTimes(isValid ? 1 : 0);
	});

	it('refuses an unknown course without writing', async () => {
		const { service, entries, courses } = createService();
		vi.spyOn(courses, 'findById').mockResolvedValue(null);
		const insert = vi.spyOn(entries, 'insert');

		const result = await service.createEntry(
			{ courseId: courseId.toHexString(), status: 'planning', term: null },
			student
		);

		expect(result).toEqual({ kind: 'course-not-found' });
		expect(insert).not.toHaveBeenCalled();
	});

	it('changes and deletes entries only through the acting owner', async () => {
		const { service, entries } = createService();
		const update = vi.spyOn(entries, 'updateOwned').mockResolvedValue(false);
		const remove = vi.spyOn(entries, 'deleteOwned').mockResolvedValue(false);
		const changes = { status: 'took', term: { season: 'fall', year: 2026 }, visibility: 'visible' };

		expect(await service.updateEntry(entryId.toHexString(), changes, student)).toBeNull();
		expect(await service.deleteEntry(entryId.toHexString(), student)).toBe(false);
		expect(update).toHaveBeenCalledWith(
			entryId,
			new ObjectId(student.id),
			expect.objectContaining({ status: 'took', visibility: 'visible' }),
			expect.any(Date)
		);
		expect(remove).toHaveBeenCalledWith(entryId, new ObjectId(student.id));
	});

	it('shows other users only visible fields, never notes or visibility', async () => {
		const { service, entries, users } = createService();
		const ownerId = new ObjectId('000000000000000000000005');
		vi.spyOn(users, 'findIdByUsername').mockResolvedValue(ownerId);
		const findVisible = vi
			.spyOn(entries, 'findVisibleEntries')
			.mockResolvedValue([
				{ _id: entryId, course, status: 'took', term: { season: 'spring', year: 2026 } }
			]);

		const history = await service.listVisibleEntries('Alex_M', student);

		expect(findVisible).toHaveBeenCalledWith(ownerId, expect.any(Number));
		expect(Object.keys(history!.entries[0]).sort()).toEqual(['course', 'id', 'status', 'term']);
	});

	it('reports an unknown username', async () => {
		const { service, users, entries } = createService();
		vi.spyOn(users, 'findIdByUsername').mockResolvedValue(null);
		const findVisible = vi.spyOn(entries, 'findVisibleEntries');

		expect(await service.listVisibleEntries('nobody', student)).toBeNull();
		expect(findVisible).not.toHaveBeenCalled();
	});

	it.each([null, { ...student, status: 'suspended' as const }])(
		'rejects accounts without active admission: %j',
		async (actor) => {
			const { service, entries } = createService();
			const findOwn = vi.spyOn(entries, 'findOwnEntries');

			await expect(service.listOwnEntries(actor)).rejects.toThrow();
			await expect(service.listVisibleEntries('alex_m', actor)).rejects.toThrow();
			expect(findOwn).not.toHaveBeenCalled();
		}
	);
});
