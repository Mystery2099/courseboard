import type { ObjectId } from 'mongodb';

export const SPACES_COLLECTION_NAME = 'spaces';

/**
 * The discussion space of a course. Every course has exactly one, created with it. Posts,
 * memberships, and moderator assignments reference the space; its views (Overview, Questions,
 * Reviews, Discussion) are fixed, so they aren't stored.
 */
export interface SpaceDocument {
	_id: ObjectId;
	courseId: ObjectId;
	createdAt: Date;
}
