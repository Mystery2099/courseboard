import type { ObjectId } from 'mongodb';

export const MODERATOR_ASSIGNMENTS_COLLECTION_NAME = 'moderatorAssignments';

/**
 * Grants one user moderation of one course's space and nowhere else. Kept apart from `users`,
 * because the platform role (member or administrator) is global while assignments are per course.
 */
export interface ModeratorAssignmentDocument {
	_id: ObjectId;
	userId: ObjectId;
	/** Copied from the space, which never changes course, so permission checks skip a lookup. */
	courseId: ObjectId;
	spaceId: ObjectId;
	assignedBy: ObjectId;
	assignedAt: Date;
}

/** An assignment joined with its course, school, and moderator, for the admin list. */
export interface ModeratorAssignmentSummary {
	_id: ObjectId;
	assignedAt: Date;
	course: { _id: ObjectId; code: string; title: string; institutionName: string };
	moderator: { username: string; displayName: string };
}
