import { z } from 'zod';
import { objectIdSchema } from './ApiContract.ts';
import { courseIdSchema } from './CourseCatalogContract.ts';
import { usernameSchema } from './UserProfileContract.ts';

export const moderatorAssignmentIdSchema = objectIdSchema;

/** Accepts the username with or without its leading `@`. */
export const assignModeratorSchema = z.object({
	courseId: courseIdSchema,
	username: z.preprocess(
		(value) => (typeof value === 'string' ? value.trim().replace(/^@/, '') : value),
		usernameSchema
	)
});

export interface ModeratorAssignmentResponse {
	id: string;
	course: { id: string; code: string; title: string; institutionName: string };
	moderator: { username: string; displayName: string };
	assignedAt: string;
}

export interface ModeratorAssignmentListResponse {
	assignments: ModeratorAssignmentResponse[];
	hasMoreAssignments: boolean;
}

export type ModeratorAssignmentResult =
	| { kind: 'assigned'; assignment: ModeratorAssignmentResponse }
	| { kind: 'course-not-found' }
	| { kind: 'user-not-found' };
