import type { ClientSession, Collection, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import {
	USERS_COLLECTION_NAME,
	type ApplicationUser,
	type ApplicationUserDocument,
	type UserRole
} from './ApplicationUser.ts';

export class ApplicationUserRepository {
	private collection(): Collection<ApplicationUserDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<ApplicationUserDocument>(USERS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.collection().createIndex({ clerkUserId: 1 }, { unique: true });
	}

	async findByClerkUserId(
		clerkUserId: string,
		session?: ClientSession
	): Promise<ApplicationUser | null> {
		const document = await this.collection().findOne(
			{ clerkUserId },
			{ projection: { _id: 1, clerkUserId: 1, role: 1, status: 1 }, session }
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
		document: Pick<ApplicationUserDocument, '_id' | 'clerkUserId' | 'role' | 'status'>
	): ApplicationUser {
		return {
			id: document._id.toHexString(),
			clerkUserId: document.clerkUserId,
			role: document.role,
			status: document.status
		};
	}
}

export const applicationUserRepository = new ApplicationUserRepository();
