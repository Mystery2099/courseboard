import type { ObjectId } from 'mongodb';

export const USERS_COLLECTION_NAME = 'users';

export type UserRole = 'member' | 'administrator';

export type AccountStatus = 'active' | 'suspended';

/**
 * An admitted application account, linked to its Clerk identity by `clerkUserId`. Credentials and
 * email addresses stay in Clerk. Profile fields are absent until onboarding sets them together.
 */
export interface ApplicationUserDocument {
	_id: ObjectId;
	clerkUserId: string;
	role: UserRole;
	status: AccountStatus;
	/** Null for the bootstrap administrator, who is admitted without an invitation. */
	admittedByInvitationId: ObjectId | null;
	admittedAt: Date;
	/** Lowercase and unique among onboarded users. Changing it is deferred. */
	username?: string;
	displayName?: string;
	primaryInstitutionId?: ObjectId;
	/** Absent means shown. The school still sets the user's own discovery default either way. */
	primaryInstitutionHidden?: boolean;
	onboardedAt?: Date;
	/** The course page opened most recently, resumed after sign-in. Absent until the first visit. */
	lastVisitedCourseId?: ObjectId;
}

export interface ApplicationUserProfile {
	username: string;
	displayName: string;
	primaryInstitutionId: string;
	isPrimaryInstitutionHidden: boolean;
}

/** The fields request handling needs about the current user. */
export interface ApplicationUser {
	id: string;
	clerkUserId: string;
	role: UserRole;
	status: AccountStatus;
	/** Null until onboarding is complete. */
	profile: ApplicationUserProfile | null;
}
