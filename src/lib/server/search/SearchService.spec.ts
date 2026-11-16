import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import {
	SEARCH_PAGE_SIZE,
	SEARCH_PREVIEW_SIZE,
	searchQuerySchema,
	type SearchQuery
} from '#lib/contracts/SearchContract.ts';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import { CourseRepository, type CourseSearchRow } from '#lib/server/catalog/CourseRepository.ts';
import { InstitutionRepository } from '#lib/server/catalog/InstitutionRepository.ts';
import { PostRepository } from '#lib/server/content/PostRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { PeopleSearchRepository } from '#lib/server/users/PeopleSearchRepository.ts';
import { SearchService } from './SearchService.ts';

const primaryInstitutionId = new ObjectId();
const searcher: ApplicationUser = {
	id: new ObjectId().toHexString(),
	clerkUserId: 'searcher',
	role: 'member',
	status: 'active',
	profile: {
		username: 'searcher',
		displayName: 'Searcher',
		primaryInstitutionId: primaryInstitutionId.toHexString(),
		isPrimaryInstitutionHidden: false
	}
};

const schoolCourse = { _id: new ObjectId(), code: 'CISY 7013', title: 'NoSQL Data Systems' };

function courseRows(count: number): CourseSearchRow[] {
	return Array.from({ length: count }, (_, index) => ({
		_id: new ObjectId(),
		code: `CISY ${index}`,
		title: 'Course',
		institutionName: 'Alfred State College'
	}));
}

function createService() {
	const institutions = new InstitutionRepository();
	const courses = new CourseRepository();
	const posts = new PostRepository();
	const people = new PeopleSearchRepository();
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(institutions, 'findById').mockImplementation(async (institutionId) => ({
		_id: institutionId,
		name: 'Alfred State College'
	}));
	vi.spyOn(courses, 'findOptionsByInstitution').mockResolvedValue([schoolCourse]);
	const searchByCodePrefix = vi.spyOn(courses, 'searchByCodePrefix').mockResolvedValue([]);
	const searchByText = vi.spyOn(courses, 'searchByText').mockResolvedValue([]);
	const searchPosts = vi.spyOn(posts, 'searchPublished').mockResolvedValue([]);
	const searchPeople = vi.spyOn(people, 'search').mockResolvedValue([]);
	const service = new SearchService(institutions, courses, posts, people);
	const search = (query: SearchQuery, actor: ApplicationUser | null = searcher) =>
		service.search(searchQuerySchema.parse(query), actor);
	return { search, searchByCodePrefix, searchByText, searchPosts, searchPeople };
}

afterEach(() => vi.restoreAllMocks());

describe('search service', () => {
	it('looks up a course code by prefix and other text through the text index', async () => {
		const { search, searchByCodePrefix, searchByText } = createService();

		await search({ q: 'cisy 22', scope: 'courses' });
		await search({ q: 'databases', scope: 'courses', institutionId: '' });

		expect(searchByCodePrefix).toHaveBeenCalledWith(
			'CISY22',
			primaryInstitutionId,
			0,
			SEARCH_PAGE_SIZE + 1
		);
		expect(searchByText).toHaveBeenCalledWith('databases', null, 0, SEARCH_PAGE_SIZE + 1);
	});

	it('pages a scope and reports whether more results exist', async () => {
		const { search, searchByText } = createService();
		searchByText.mockResolvedValue(courseRows(SEARCH_PAGE_SIZE + 1));

		const response = await search({ q: 'course', scope: 'courses', page: '2' });

		expect(searchByText).toHaveBeenCalledWith(
			'course',
			primaryInstitutionId,
			SEARCH_PAGE_SIZE,
			SEARCH_PAGE_SIZE + 1
		);
		expect(response.courses?.results).toHaveLength(SEARCH_PAGE_SIZE);
		expect(response.courses?.hasMore).toBe(true);
		expect(response.posts).toBeNull();
	});

	it('previews every kind under Everything, and searches nothing without text', async () => {
		const { search, searchByText, searchPosts, searchPeople } = createService();

		const empty = await search({});
		await search({ q: 'ana' });

		expect(empty).toMatchObject({ courses: null, posts: null, people: null });
		expect(searchByText).toHaveBeenCalledTimes(1);
		expect(searchPosts).toHaveBeenCalledWith('ana', [schoolCourse._id], 0, SEARCH_PREVIEW_SIZE + 1);
		expect(searchPeople).toHaveBeenCalledTimes(1);
	});

	it('treats filters the form leaves on "any" as absent', async () => {
		const { search, searchPeople } = createService();

		await search({ scope: 'people', courseId: '', status: '' });

		expect(searchPeople).toHaveBeenCalledWith(
			expect.objectContaining({
				courseId: null,
				status: null,
				institutionId: primaryInstitutionId
			}),
			0,
			SEARCH_PAGE_SIZE + 1
		);
	});

	it('drops a course that belongs to another school instead of ignoring the school', async () => {
		const { search, searchPeople } = createService();
		const otherSchoolCourseId = new ObjectId().toHexString();

		const mismatched = await search({ scope: 'people', courseId: otherSchoolCourseId });
		const matching = await search({ scope: 'people', courseId: schoolCourse._id.toHexString() });

		expect(mismatched.query.courseId).toBeUndefined();
		expect(searchPeople).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ courseId: null }),
			0,
			SEARCH_PAGE_SIZE + 1
		);
		expect(matching.query.courseId).toBe(schoolCourse._id.toHexString());
		expect(matching.courseOptions).toEqual([
			{ id: schoolCourse._id.toHexString(), code: 'CISY 7013', title: 'NoSQL Data Systems' }
		]);
	});

	it('refuses a suspended account', async () => {
		const { search } = createService();

		await expect(search({ q: 'ana' }, { ...searcher, status: 'suspended' })).rejects.toThrow(
			AccessDeniedError
		);
	});
});
