import { ObjectId } from 'mongodb';
import {
	SEARCH_PAGE_SIZE,
	SEARCH_PREVIEW_SIZE,
	type CourseSearchResult,
	type ParsedSearchQuery,
	type PersonSearchResult,
	type PostSearchResult,
	type SearchResponse,
	type SearchSection
} from '#lib/contracts/SearchContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { normalizeCourseCode } from '#lib/server/catalog/Course.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import {
	institutionRepository,
	type InstitutionRepository
} from '#lib/server/catalog/InstitutionRepository.ts';
import { postRepository, type PostRepository } from '#lib/server/content/PostRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	peopleSearchRepository,
	type PeopleSearchRepository
} from '#lib/server/users/PeopleSearchRepository.ts';
import { SearchSnippet } from './SearchSnippet.ts';

/** Letters followed by digits, such as `CISY2253` or `CISY22`, are looked up as course codes. */
const COURSE_CODE_PATTERN = /^[A-Z]{2,6}\d{1,5}[A-Z]?$/;

/** A school's whole catalog bounds the course IDs a school filter can expand to. */
const INSTITUTION_COURSE_LIMIT = 2_000;

interface ResolvedScope {
	institutionId: ObjectId | null;
	institutionCourseIds: ObjectId[] | null;
}

/** Course, post, and people search. Any admitted user can search; people results stay privacy-safe. */
export class SearchService {
	constructor(
		private readonly institutions: InstitutionRepository,
		private readonly courses: CourseRepository,
		private readonly posts: PostRepository,
		private readonly people: PeopleSearchRepository
	) {}

	async search(
		requestedQuery: ParsedSearchQuery,
		actor: ApplicationUser | null
	): Promise<SearchResponse> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		await DatabaseIndexInitializer.ensureIndexes();

		const institution = await this.resolveInstitution(requestedQuery, user);
		const institutionCourses = institution
			? await this.courses.findOptionsByInstitution(institution._id, INSTITUTION_COURSE_LIMIT)
			: null;
		const scope: ResolvedScope = {
			institutionId: institution?._id ?? null,
			institutionCourseIds: institutionCourses?.map((course) => course._id) ?? null
		};
		// A course left selected from another school would silently override the school filter.
		const isCourseAtSchool =
			!requestedQuery.courseId ||
			!institutionCourses ||
			institutionCourses.some((course) => course._id.toHexString() === requestedQuery.courseId);
		const query = isCourseAtSchool ? requestedQuery : { ...requestedQuery, courseId: undefined };
		const isPreview = query.scope === 'everything';
		const limit = isPreview ? SEARCH_PREVIEW_SIZE : SEARCH_PAGE_SIZE;
		const skip = isPreview ? 0 : (query.page - 1) * SEARCH_PAGE_SIZE;
		const wants = (kind: 'courses' | 'posts' | 'people') =>
			query.scope === 'everything' || query.scope === kind;
		// Everything is a text search; only the People scope can list people by filters alone.
		const hasPeopleFilter = isPreview
			? Boolean(query.q)
			: Boolean(query.q || query.courseId || query.status || institution);

		const [courses, posts, people] = await Promise.all([
			wants('courses') && query.q ? this.searchCourses(query.q, scope, skip, limit) : null,
			wants('posts') && query.q ? this.searchPosts(query.q, scope, skip, limit) : null,
			wants('people') && hasPeopleFilter ? this.searchPeople(query, scope, skip, limit) : null
		]);
		return {
			query,
			institution: institution
				? { id: institution._id.toHexString(), name: institution.name }
				: null,
			courses,
			posts,
			people,
			courseOptions:
				query.scope === 'people'
					? (institutionCourses ?? []).map((course) => ({
							id: course._id.toHexString(),
							code: course.code,
							title: course.title
						}))
					: []
		};
	}

	/** Left out means the searcher's primary school; an empty string means every school. */
	private async resolveInstitution(query: ParsedSearchQuery, user: ApplicationUser) {
		const requestedId =
			query.institutionId === undefined ? user.profile?.primaryInstitutionId : query.institutionId;
		if (!requestedId || !ObjectId.isValid(requestedId)) return null;
		return this.institutions.findById(new ObjectId(requestedId));
	}

	private async searchCourses(
		text: string,
		scope: ResolvedScope,
		skip: number,
		limit: number
	): Promise<SearchSection<CourseSearchResult>> {
		const code = normalizeCourseCode(text);
		const rows = COURSE_CODE_PATTERN.test(code)
			? await this.courses.searchByCodePrefix(code, scope.institutionId, skip, limit + 1)
			: await this.courses.searchByText(text, scope.institutionId, skip, limit + 1);
		return SearchService.toSection(rows, limit, (row) => ({
			id: row._id.toHexString(),
			code: row.code,
			title: row.title,
			institutionName: row.institutionName
		}));
	}

	private async searchPosts(
		text: string,
		scope: ResolvedScope,
		skip: number,
		limit: number
	): Promise<SearchSection<PostSearchResult>> {
		const rows = await this.posts.searchPublished(
			text,
			scope.institutionCourseIds,
			skip,
			limit + 1
		);
		return SearchService.toSection(rows, limit, (row) => ({
			id: row._id.toHexString(),
			courseId: row.courseId.toHexString(),
			courseCode: row.courseCode,
			kind: row.kind,
			title: row.title,
			snippet: SearchSnippet.around(row.bodyMarkdown, text),
			authorDisplayName: row.authorDisplayName,
			lastActivityAt: row.lastActivityAt.toISOString()
		}));
	}

	private async searchPeople(
		query: ParsedSearchQuery,
		scope: ResolvedScope,
		skip: number,
		limit: number
	): Promise<SearchSection<PersonSearchResult>> {
		const rows = await this.people.search(
			{
				name: query.q,
				institutionId: scope.institutionId,
				institutionCourseIds: scope.institutionCourseIds ?? [],
				courseId: query.courseId ? new ObjectId(query.courseId) : null,
				status: query.status ?? null
			},
			skip,
			limit + 1
		);
		return SearchService.toSection(rows, limit, (row) => row);
	}

	/** Rows are fetched one past the limit, so the extra row only signals that more exist. */
	private static toSection<Row, Result>(
		rows: Row[],
		limit: number,
		toResult: (row: Row) => Result
	): SearchSection<Result> {
		return { results: rows.slice(0, limit).map(toResult), hasMore: rows.length > limit };
	}
}

export const searchService = new SearchService(
	institutionRepository,
	courseRepository,
	postRepository,
	peopleSearchRepository
);
