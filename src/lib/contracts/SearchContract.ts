import { z } from 'zod';
import {
	HISTORY_STATUSES,
	type AcademicTerm,
	type HistoryStatus
} from './AcademicHistoryContract.ts';
import { objectIdSchema } from './ApiContract.ts';
import type { PostKind } from './PostContract.ts';

export const SEARCH_SCOPES = ['everything', 'courses', 'posts', 'people'] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

export const SEARCH_QUERY_MAX_LENGTH = 100;
/** Results are a short bounded list rather than an endless feed; see the MongoDB model. */
export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_MAX_PAGE = 5;
/** How many of each kind the Everything scope shows before linking to the full list. */
export const SEARCH_PREVIEW_SIZE = 3;

/** A filter the search form submits as an empty string when it's left on "any". */
const optionalFilter = <Schema extends z.ZodType>(schema: Schema) =>
	z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

/** An empty `institutionId` means all schools; leaving it out means the searcher's own school. */
export const searchQuerySchema = z.object({
	q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).default(''),
	scope: z.enum(SEARCH_SCOPES).default('everything'),
	institutionId: z.union([objectIdSchema, z.literal('')]).optional(),
	courseId: optionalFilter(objectIdSchema),
	status: optionalFilter(z.enum(HISTORY_STATUSES)),
	page: z.coerce.number().int().min(1).max(SEARCH_MAX_PAGE).default(1)
});

export type SearchQuery = z.input<typeof searchQuerySchema>;
export type ParsedSearchQuery = z.infer<typeof searchQuerySchema>;

export interface CourseSearchResult {
	id: string;
	code: string;
	title: string;
	institutionName: string;
}

export interface PostSearchResult {
	id: string;
	courseId: string;
	courseCode: string;
	kind: PostKind;
	title: string;
	/** Plain text around the first matched word, cut on the server. */
	snippet: string;
	authorDisplayName: string;
	lastActivityAt: string;
}

/** A visible history entry that matched the course or status filter. Always self-reported. */
export interface MatchedHistoryEntry {
	courseCode: string;
	status: HistoryStatus;
	term: AcademicTerm | null;
}

export interface PersonSearchResult {
	username: string;
	displayName: string;
	/** Null when the person hides their primary school. */
	primaryInstitutionName: string | null;
	matchedEntries: MatchedHistoryEntry[];
}

export interface SearchSection<Result> {
	results: Result[];
	hasMore: boolean;
}

export interface SearchCourseOption {
	id: string;
	code: string;
	title: string;
}

export interface SearchResponse {
	/** The search as it ran: a course from outside the chosen school is dropped. */
	query: ParsedSearchQuery;
	/** The school the search was limited to, or null for all schools. */
	institution: { id: string; name: string } | null;
	courses: SearchSection<CourseSearchResult> | null;
	posts: SearchSection<PostSearchResult> | null;
	people: SearchSection<PersonSearchResult> | null;
	/** The chosen school's courses for the People course filter; empty in other scopes. */
	courseOptions: SearchCourseOption[];
}
