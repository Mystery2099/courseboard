import type { ObjectId } from 'mongodb';
import type {
	AcademicTerm,
	HistoryStatus,
	HistoryVisibility
} from '#lib/contracts/AcademicHistoryContract.ts';

export const ACADEMIC_HISTORIES_COLLECTION_NAME = 'academicHistories';

/**
 * One self-reported attempt at a course. A course can have several entries for repeated attempts,
 * each with its own status, term, and visibility. Independent of following and of reviews.
 */
export interface AcademicHistoryEntryDocument {
	_id: ObjectId;
	userId: ObjectId;
	courseId: ObjectId;
	status: HistoryStatus;
	/** Null only while Planning. */
	term: AcademicTerm | null;
	visibility: HistoryVisibility;
	/** Returned only to the owner; never part of any other projection. */
	privateNote: string;
	createdAt: Date;
	updatedAt: Date;
}

export type HistoryEntryChanges = Pick<
	AcademicHistoryEntryDocument,
	'status' | 'term' | 'visibility' | 'privateNote'
>;

export interface HistoryEntryCourse {
	courseId: ObjectId;
	code: string;
	title: string;
	institutionId: ObjectId;
	institutionName: string;
}

export interface OwnHistoryEntry extends HistoryEntryChanges {
	_id: ObjectId;
	course: HistoryEntryCourse;
}

export interface VisibleHistoryEntry extends Pick<
	AcademicHistoryEntryDocument,
	'_id' | 'status' | 'term'
> {
	course: HistoryEntryCourse;
}
