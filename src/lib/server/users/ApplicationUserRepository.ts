import type { ClientSession, Collection, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { MongoErrorClassifier } from '#lib/server/persistence/MongoErrorClassifier.ts';
import {
	USERS_COLLECTION_NAME,
	type ApplicationUser,
	type ApplicationUserDocument,
	type UserRole
} from './ApplicationUser.ts';

export interface OnboardingProfile {
	username: string;
	displayName: string;
	primaryInstitutionId: ObjectId;
}

/** What another admitted user may see about someone; never the email address or role. */
export interface PublicProfileRecord {
	_id: ObjectId;
	clerkUserId: string;
	username: string;
	displayName: string;
	/** Null when the user hides their primary institution. */
	primaryInstitutionId: ObjectId | null;
}

/** The profile fields a user may change after onboarding. */
export interface ProfileChanges {
	displayName?: string;
	primaryInstitutionHidden?: boolean;
}

export type ProfileCreationOutcome = 'created' | 'already-onboarded' | 'username-unavailable';

export class ApplicationUserRepository {
	private static readonly CURRENT_USER_PROJECTION = {
		_id: 1,
		clerkUserId: 1,
		role: 1,
		status: 1,
		username: 1,
		displayName: 1,
		primaryInstitutionId: 1,
		primaryInstitutionHidden: 1
	} as const;

	private collection(): Collection<ApplicationUserDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<ApplicationUserDocument>(USERS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.collection().createIndex({ clerkUserId: 1 }, { unique: true });
		// Partial, because accounts that haven't finished onboarding have no username yet.
		await this.collection().createIndex(
			{ username: 1 },
			{ unique: true, partialFilterExpression: { username: { $type: 'string' } } }
		);
	}

	async findByClerkUserId(
		clerkUserId: string,
		session?: ClientSession
	): Promise<ApplicationUser | null> {
		const document = await this.collection().findOne(
			{ clerkUserId },
			{ projection: ApplicationUserRepository.CURRENT_USER_PROJECTION, session }
		);
		return document ? ApplicationUserRepository.toApplicationUser(document) : null;
	}

	async insert(
		clerkUserId: string,
		role: UserRole,
		admittedByInvitationId: ObjectId | null,
		admittedAt: Date,
		session?: ClientSession
	): Promise<void> {
		await this.collection().insertOne(
			{
				clerkUserId,
				role,
				status: 'active',
				admittedByInvitationId,
				admittedAt
			} as ApplicationUserDocument,
			{ session }
		);
	}

	/** Atomically creates the user with `role` unless one already exists for this Clerk identity. */
	async insertIfAbsent(clerkUserId: string, role: UserRole, admittedAt: Date): Promise<void> {
		await this.collection().updateOne(
			{ clerkUserId },
			{
				$setOnInsert: {
					clerkUserId,
					role,
					status: 'active',
					admittedByInvitationId: null,
					admittedAt
				}
			},
			{ upsert: true }
		);
	}

	/** Sets every profile field at once, only if onboarding hasn't already set them. */
	async createProfile(
		userId: ObjectId,
		profile: OnboardingProfile,
		onboardedAt: Date
	): Promise<ProfileCreationOutcome> {
		try {
			const result = await this.collection().updateOne(
				{ _id: userId, username: { $exists: false } },
				{ $set: { ...profile, onboardedAt } }
			);
			return result.matchedCount === 1 ? 'created' : 'already-onboarded';
		} catch (cause) {
			if (MongoErrorClassifier.isDuplicateKeyError(cause)) {
				return 'username-unavailable';
			}
			throw cause;
		}
	}

	/** Returns false when the user hasn't finished onboarding. */
	async updateProfile(userId: ObjectId, changes: ProfileChanges): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: userId, username: { $exists: true } },
			{ $set: changes }
		);
		return result.matchedCount === 1;
	}

	/** Only onboarded users have a username, so this never finds an unfinished account. */
	async findIdByUsername(username: string): Promise<ObjectId | null> {
		const document = await this.collection().findOne({ username }, { projection: { _id: 1 } });
		return document?._id ?? null;
	}

	/** The active, onboarded accounts among `usernames`: the people a post may mention. */
	async findMentionableByUsernames(
		usernames: readonly string[]
	): Promise<{ _id: ObjectId; username: string }[]> {
		if (usernames.length === 0) return [];
		const documents = await this.collection()
			.find(
				{ username: { $in: [...usernames] }, status: 'active' },
				{ projection: { _id: 1, username: 1 } }
			)
			.toArray();
		return documents.flatMap(({ _id, username }) => (username ? [{ _id, username }] : []));
	}

	async findPublicProfileByUsername(username: string): Promise<PublicProfileRecord | null> {
		const document = await this.collection().findOne(
			{ username },
			{
				projection: {
					_id: 1,
					clerkUserId: 1,
					username: 1,
					displayName: 1,
					primaryInstitutionId: 1,
					primaryInstitutionHidden: 1
				}
			}
		);
		if (!document?.username || !document.displayName) return null;
		return {
			_id: document._id,
			clerkUserId: document.clerkUserId,
			username: document.username,
			displayName: document.displayName,
			// A hidden school is dropped here, so no caller can pass it on by accident.
			primaryInstitutionId: document.primaryInstitutionHidden
				? null
				: (document.primaryInstitutionId ?? null)
		};
	}

	async updateLastVisitedCourse(userId: ObjectId, courseId: ObjectId): Promise<void> {
		await this.collection().updateOne({ _id: userId }, { $set: { lastVisitedCourseId: courseId } });
	}

	async findLastVisitedCourseId(userId: ObjectId): Promise<ObjectId | null> {
		const document = await this.collection().findOne(
			{ _id: userId },
			{ projection: { lastVisitedCourseId: 1 } }
		);
		return document?.lastVisitedCourseId ?? null;
	}

	private static toApplicationUser(
		document: Pick<
			ApplicationUserDocument,
			| '_id'
			| 'clerkUserId'
			| 'role'
			| 'status'
			| 'username'
			| 'displayName'
			| 'primaryInstitutionId'
			| 'primaryInstitutionHidden'
		>
	): ApplicationUser {
		const { username, displayName, primaryInstitutionId } = document;
		return {
			id: document._id.toHexString(),
			clerkUserId: document.clerkUserId,
			role: document.role,
			status: document.status,
			profile:
				username && displayName && primaryInstitutionId
					? {
							username,
							displayName,
							primaryInstitutionId: primaryInstitutionId.toHexString(),
							isPrimaryInstitutionHidden: document.primaryInstitutionHidden === true
						}
					: null
		};
	}
}

export const applicationUserRepository = new ApplicationUserRepository();
