import type { Collection, Document, ObjectId } from 'mongodb';
import { COURSES_COLLECTION_NAME } from '#lib/server/catalog/Course.ts';
import { INSTITUTIONS_COLLECTION_NAME } from '#lib/server/catalog/Institution.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { USERS_COLLECTION_NAME } from '#lib/server/users/ApplicationUser.ts';
import {
	MODERATOR_ASSIGNMENTS_COLLECTION_NAME,
	type ModeratorAssignmentDocument,
	type ModeratorAssignmentSummary
} from './ModeratorAssignment.ts';

export class ModeratorAssignmentRepository {
	/** Joins the course, its school, and the moderator's public names; nothing else leaves. */
	private static readonly SUMMARY_STAGES: readonly Document[] = [
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
			$lookup: {
				from: USERS_COLLECTION_NAME,
				localField: 'userId',
				foreignField: '_id',
				as: 'moderator',
				pipeline: [{ $project: { _id: 0, username: 1, displayName: 1 } }]
			}
		},
		{ $unwind: '$moderator' },
		{
			$project: {
				assignedAt: 1,
				course: {
					_id: '$course._id',
					code: '$course.code',
					title: '$course.title',
					institutionName: '$institution.name'
				},
				moderator: 1
			}
		}
	];

	private collection(): Collection<ModeratorAssignmentDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<ModeratorAssignmentDocument>(MODERATOR_ASSIGNMENTS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// One assignment per user and course; also serves the permission check.
		await this.collection().createIndex({ courseId: 1, userId: 1 }, { unique: true });
	}

	/** Idempotent: assigning again keeps the original assignment. Returns its id either way. */
	async insertIfAbsent(assignment: Omit<ModeratorAssignmentDocument, '_id'>): Promise<ObjectId> {
		const { courseId, userId } = assignment;
		const stored = await this.collection().findOneAndUpdate(
			{ courseId, userId },
			{ $setOnInsert: assignment },
			{ upsert: true, returnDocument: 'after', projection: { _id: 1 } }
		);
		if (!stored) throw new Error('The moderator assignment upsert returned no document.');
		return stored._id;
	}

	async delete(assignmentId: ObjectId): Promise<boolean> {
		const result = await this.collection().deleteOne({ _id: assignmentId });
		return result.deletedCount === 1;
	}

	async isAssigned(userId: ObjectId, courseId: ObjectId): Promise<boolean> {
		return (await this.collection().countDocuments({ courseId, userId }, { limit: 1 })) === 1;
	}

	/** Newest first. */
	async findSummaries(limit: number): Promise<ModeratorAssignmentSummary[]> {
		return this.collection()
			.aggregate<ModeratorAssignmentSummary>([
				{ $sort: { assignedAt: -1, _id: -1 } },
				{ $limit: limit },
				...ModeratorAssignmentRepository.SUMMARY_STAGES
			])
			.toArray();
	}

	async findSummaryById(assignmentId: ObjectId): Promise<ModeratorAssignmentSummary | null> {
		const [summary] = await this.collection()
			.aggregate<ModeratorAssignmentSummary>([
				{ $match: { _id: assignmentId } },
				...ModeratorAssignmentRepository.SUMMARY_STAGES
			])
			.toArray();
		return summary ?? null;
	}
}

export const moderatorAssignmentRepository = new ModeratorAssignmentRepository();
