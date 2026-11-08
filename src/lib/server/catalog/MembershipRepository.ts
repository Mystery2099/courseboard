import type { Collection, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { COURSES_COLLECTION_NAME } from './Course.ts';
import { INSTITUTIONS_COLLECTION_NAME } from './Institution.ts';
import { MEMBERSHIPS_COLLECTION_NAME, type MembershipDocument } from './Membership.ts';

export interface FollowedCourse {
	courseId: ObjectId;
	code: string;
	title: string;
	institutionName: string;
}

export class MembershipRepository {
	private collection(): Collection<MembershipDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<MembershipDocument>(MEMBERSHIPS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.collection().createIndexes([
			{ key: { userId: 1, spaceId: 1 }, unique: true },
			{ key: { userId: 1, followedAt: -1 } }
		]);
	}

	/** Idempotent: following a space twice keeps the original `followedAt`. */
	async insertIfAbsent(
		userId: ObjectId,
		spaceId: ObjectId,
		courseId: ObjectId,
		followedAt: Date
	): Promise<void> {
		await this.collection().updateOne(
			{ userId, spaceId },
			{ $setOnInsert: { userId, spaceId, courseId, followedAt } },
			{ upsert: true }
		);
	}

	async delete(userId: ObjectId, spaceId: ObjectId): Promise<void> {
		await this.collection().deleteOne({ userId, spaceId });
	}

	async exists(userId: ObjectId, spaceId: ObjectId): Promise<boolean> {
		const membership = await this.collection().findOne(
			{ userId, spaceId },
			{ projection: { _id: 1 } }
		);
		return membership !== null;
	}

	/** Which of `spaceIds` the user follows. */
	async findFollowedSpaceIds(userId: ObjectId, spaceIds: ObjectId[]): Promise<Set<string>> {
		const memberships = await this.collection()
			.find({ userId, spaceId: { $in: spaceIds } }, { projection: { _id: 0, spaceId: 1 } })
			.toArray();
		return new Set(memberships.map((membership) => membership.spaceId.toHexString()));
	}

	/** The user's followed courses, most recently followed first, joined with course and school. */
	async findFollowedCourses(userId: ObjectId, limit: number): Promise<FollowedCourse[]> {
		return this.collection()
			.aggregate<FollowedCourse>([
				{ $match: { userId } },
				{ $sort: { followedAt: -1 } },
				{ $limit: limit },
				{
					$lookup: {
						from: COURSES_COLLECTION_NAME,
						localField: 'courseId',
						foreignField: '_id',
						as: 'course',
						pipeline: [{ $project: { code: 1, title: 1, institutionId: 1 } }]
					}
				},
				{ $unwind: '$course' },
				{
					$lookup: {
						from: INSTITUTIONS_COLLECTION_NAME,
						localField: 'course.institutionId',
						foreignField: '_id',
						as: 'institution',
						pipeline: [{ $project: { name: 1 } }]
					}
				},
				{ $unwind: '$institution' },
				{
					$project: {
						_id: 0,
						courseId: 1,
						code: '$course.code',
						title: '$course.title',
						institutionName: '$institution.name'
					}
				}
			])
			.toArray();
	}
}

export const membershipRepository = new MembershipRepository();
