import type { ObjectId } from 'mongodb';

export const USERS_COLLECTION_NAME = 'users';

export type UserRole = 'member' | 'administrator';

export type AccountStatus = 'active' | 'suspended';

/**
 * An admitted application account, linked to its Clerk identity by `clerkUserId`. Credentials and
 * email addresses stay in Clerk. Onboarding adds profile fields (username, display name, primary
 * institution) in Stage 1.
 */
export interface ApplicationUserDocument {
	_id: ObjectId;
	clerkUserId: string;
	role: UserRole;
	status: AccountStatus;
	/** Null for the bootstrap administrator, who is admitted without an invitation. */
	admittedByInvitationId: ObjectId | null;
	admittedAt: Date;
	/** The course page opened most recently, resumed after sign-in. Absent until the first visit. */
	lastVisitedCourseId?: ObjectId;
}

/** The fields request handling needs about the current user. */
export interface ApplicationUser {
	id: string;
	clerkUserId: string;
	role: UserRole;
	status: AccountStatus;
}
