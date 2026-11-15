import { z } from 'zod';
import { academicTermSchema, type AcademicTerm } from './AcademicHistoryContract.ts';
import { objectIdSchema } from './ApiContract.ts';
import { createPostSchema, type PostDetailResponse } from './PostContract.ts';

export const REVIEW_PARTICIPATION_STATUSES = ['taking', 'took'] as const;
export type ReviewParticipationStatus = (typeof REVIEW_PARTICIPATION_STATUSES)[number];

/** Participation is a publication snapshot, not a live link to a private history entry. */
export interface ReviewData {
	status: ReviewParticipationStatus;
	term: AcademicTerm;
	workload: number;
	wouldTakeAgain: boolean;
}

export const updateReviewSchema = createPostSchema
	.pick({ title: true, bodyMarkdown: true })
	.extend({
		workload: z.number().int().min(1).max(5),
		wouldTakeAgain: z.boolean()
	});

/** The acknowledged status and term must still match the entry when the review is published. */
export const createReviewSchema = updateReviewSchema.extend({
	historyEntryId: objectIdSchema,
	acknowledgedStatus: z.enum(REVIEW_PARTICIPATION_STATUSES),
	acknowledgedTerm: academicTermSchema,
	disclosureAcknowledged: z.literal(true)
});

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
export type UpdateReviewRequest = z.infer<typeof updateReviewSchema>;

export interface ReviewAttemptResponse {
	id: string;
	status: ReviewParticipationStatus;
	term: AcademicTerm;
}

export interface ReviewStatisticsResponse {
	reviewCount: number;
	averageWorkload: number | null;
	wouldTakeAgainPercentage: number | null;
}

/** Attempts and the existing review belong only to the caller; statistics use published reviews. */
export interface CourseReviewContextResponse {
	statistics: ReviewStatisticsResponse;
	ownReviewId: string | null;
	attempts: ReviewAttemptResponse[];
}

export type ReviewCreationResult =
	| { kind: 'created'; post: PostDetailResponse }
	| { kind: 'course-not-found' }
	| { kind: 'history-required' }
	| { kind: 'review-exists' };
