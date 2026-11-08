import type { ObjectId } from 'mongodb';

export const COURSES_COLLECTION_NAME = 'courses';

/**
 * A course at one institution. Codes are only unique within an institution, so a course is
 * identified by its `_id`, never by its code alone.
 */
export interface CourseDocument {
	_id: ObjectId;
	institutionId: ObjectId;
	code: string;
	/** Uppercased without whitespace, so "cs 101" and "CS101" are the same course. */
	normalizedCode: string;
	title: string;
	description: string;
	/** The canonical discussion space, created in the same transaction as the course. */
	spaceId: ObjectId;
	createdAt: Date;
}

export function normalizeCourseCode(code: string): string {
	return code.replace(/\s+/g, '').toUpperCase();
}
