import type { ObjectId } from 'mongodb';

export const MEMBERSHIPS_COLLECTION_NAME = 'memberships';

/**
 * A user following a course's space for navigation. It is never evidence that the user took the
 * course and is independent of academic history.
 */
export interface MembershipDocument {
	_id: ObjectId;
	userId: ObjectId;
	spaceId: ObjectId;
	/** Copied from the space, which never changes course, so followed-course lists skip a lookup. */
	courseId: ObjectId;
	followedAt: Date;
}
