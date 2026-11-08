import { z } from 'zod';
import { objectIdSchema } from './ApiContract.ts';

export const HISTORY_STATUSES = ['planning', 'taking', 'took'] as const;
export const TERM_SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
export const HISTORY_VISIBILITIES = ['private', 'visible'] as const;

export type HistoryStatus = (typeof HISTORY_STATUSES)[number];
export type TermSeason = (typeof TERM_SEASONS)[number];
export type HistoryVisibility = (typeof HISTORY_VISIBILITIES)[number];

export const PRIVATE_NOTE_MAX_LENGTH = 1000;

export const academicTermSchema = z.object({
	season: z.enum(TERM_SEASONS),
	year: z.number().int().min(1950).max(2100)
});

export type AcademicTerm = z.infer<typeof academicTermSchema>;

const privateNoteSchema = z
	.string()
	.trim()
	.max(PRIVATE_NOTE_MAX_LENGTH, `Use ${PRIVATE_NOTE_MAX_LENGTH} characters or fewer.`)
	.regex(/^(?:[^\p{C}]|[\n\r\t])*$/u, 'Remove control characters.');

const historyEntryFieldsSchema = z.object({
	status: z.enum(HISTORY_STATUSES),
	term: academicTermSchema.nullable(),
	visibility: z.enum(HISTORY_VISIBILITIES).default('private'),
	privateNote: privateNoteSchema.default('')
});

type HistoryEntryFields = z.infer<typeof historyEntryFieldsSchema>;

/** Only Planning may leave the term out. */
function hasRequiredTerm(entry: HistoryEntryFields): boolean {
	return entry.status === 'planning' || entry.term !== null;
}

const termRequiredIssue = { path: ['term'], message: 'Choose a term.' };

export const createHistoryEntrySchema = historyEntryFieldsSchema
	.extend({ courseId: objectIdSchema })
	.refine(hasRequiredTerm, termRequiredIssue);

export type CreateHistoryEntryRequest = z.infer<typeof createHistoryEntrySchema>;

/** The course is fixed once recorded; a different course is a different entry. */
export const updateHistoryEntrySchema = historyEntryFieldsSchema.refine(
	hasRequiredTerm,
	termRequiredIssue
);

export type UpdateHistoryEntryRequest = z.infer<typeof updateHistoryEntrySchema>;

export const historyEntryIdSchema = objectIdSchema;

export interface HistoryCourseResponse {
	id: string;
	code: string;
	title: string;
	institution: { id: string; name: string };
}

/** The owner's view, including visibility and the private note. */
export interface OwnHistoryEntryResponse {
	id: string;
	course: HistoryCourseResponse;
	status: HistoryStatus;
	term: AcademicTerm | null;
	visibility: HistoryVisibility;
	privateNote: string;
}

export interface OwnHistoryResponse {
	entries: OwnHistoryEntryResponse[];
}

/** What other admitted users see: only entries marked visible, without notes or visibility. */
export interface VisibleHistoryEntryResponse {
	id: string;
	course: HistoryCourseResponse;
	status: HistoryStatus;
	term: AcademicTerm | null;
}

export interface VisibleHistoryResponse {
	entries: VisibleHistoryEntryResponse[];
}

export type HistoryEntryCreationResult =
	| { kind: 'created'; entry: OwnHistoryEntryResponse }
	| { kind: 'course-not-found' }
	| { kind: 'entry-limit-reached' };
