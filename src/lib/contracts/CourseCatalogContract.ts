import { z } from 'zod';
import { objectIdSchema } from './ApiContract.ts';

export const courseIdSchema = objectIdSchema;

/** Courses are browsed one institution at a time, ordered by course code. */
export const courseBrowseQuerySchema = z.object({
	institutionId: objectIdSchema,
	/** The normalized code of the last course on the previous page. */
	after: z.string().min(1).max(40).optional()
});

export type CourseBrowseQuery = z.infer<typeof courseBrowseQuerySchema>;

export interface InstitutionResponse {
	id: string;
	name: string;
}

export interface InstitutionListResponse {
	institutions: InstitutionResponse[];
}

export interface CourseSummaryResponse {
	id: string;
	code: string;
	title: string;
	isFollowed: boolean;
}

export interface CourseBrowseResponse {
	institution: InstitutionResponse;
	courses: CourseSummaryResponse[];
	/** Pass as `after` to load the next page; null on the last page. */
	nextCursor: string | null;
}

export interface CourseDetailResponse {
	id: string;
	code: string;
	title: string;
	description: string;
	institution: InstitutionResponse;
	isFollowed: boolean;
}

export interface CatalogCourseResponse {
	id: string;
	code: string;
	title: string;
	institutionName: string;
}

export interface CatalogCourseListResponse {
	courses: CatalogCourseResponse[];
	hasMoreCourses: boolean;
}

export interface DemoCatalogLoadResponse {
	institutionsCreated: number;
	coursesCreated: number;
}
