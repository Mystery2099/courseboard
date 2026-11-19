import type { ObjectId } from 'mongodb';

export const MODERATOR_ASSIGNMENTS_COLLECTION_NAME = 'moderatorAssignments';

/**
 * Grants one user moderation of one course's space and nowhere else. Kept apart from `users`,
 * because the platform role (member or administrator) is global while assignments are per course.
 */
export interface ModeratorAssignmentDocument {
	_id: ObjectId;
	userId: ObjectId;
	/** Permission checks start from a post, which carries its course id. */
	courseId: ObjectId;
	/** For the planned reports queue, which is indexed by space. */
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
