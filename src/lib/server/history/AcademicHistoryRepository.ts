import type { Collection, Document, Filter, ObjectId } from 'mongodb';
import { COURSES_COLLECTION_NAME } from '#lib/server/catalog/Course.ts';
import { INSTITUTIONS_COLLECTION_NAME } from '#lib/server/catalog/Institution.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import {
	ACADEMIC_HISTORIES_COLLECTION_NAME,
	type AcademicHistoryEntryDocument,
	type HistoryEntryChanges,
	type OwnHistoryEntry,
	type VisibleHistoryEntry
} from './AcademicHistoryEntry.ts';

/**
 * Every query that returns entries names its fields explicitly. The visible-entry projection leaves
 * out `visibility` and `privateNote`, so private data never leaves MongoDB for another user.
 */
export class AcademicHistoryRepository {
	private static readonly OWN_ENTRY_FIELDS = {
		status: 1,
		term: 1,
		visibility: 1,
		privateNote: 1
	} as const;

	private static readonly VISIBLE_ENTRY_FIELDS = { status: 1, term: 1 } as const;

	private collection(): Collection<AcademicHistoryEntryDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<AcademicHistoryEntryDocument>(ACADEMIC_HISTORIES_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// Not unique: repeated attempts give one user several entries for the same course.
		await this.collection().createIndex({ userId: 1, courseId: 1 });
	}

	async insert(entry: AcademicHistoryEntryDocument): Promise<void> {
		await this.collection().insertOne(entry);
	}

	async countByUser(userId: ObjectId): Promise<number> {
		return this.collection().countDocuments({ userId });
	}

	/** Matches on the owner too, so one user can never change another's entry. */
	async updateOwned(
		entryId: ObjectId,
		userId: ObjectId,
		changes: HistoryEntryChanges,
		updatedAt: Date
	): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: entryId, userId },
			{ $set: { ...changes, updatedAt } }
		);
		return result.matchedCount === 1;
	}

	async deleteOwned(entryId: ObjectId, userId: ObjectId): Promise<boolean> {
		const result = await this.collection().deleteOne({ _id: entryId, userId });
		return result.deletedCount === 1;
	}

	async findOwnEntries(userId: ObjectId, limit: number): Promise<OwnHistoryEntry[]> {
		return this.findWithCourse<OwnHistoryEntry>(
			{ userId },
			AcademicHistoryRepository.OWN_ENTRY_FIELDS,
			limit
		);
	}

	async findOwnEntry(entryId: ObjectId, userId: ObjectId): Promise<OwnHistoryEntry | null> {
		const [entry] = await this.findWithCourse<OwnHistoryEntry>(
			{ _id: entryId, userId },
			AcademicHistoryRepository.OWN_ENTRY_FIELDS,
			1
		);
		return entry ?? null;
	}

	async findVisibleEntries(userId: ObjectId, limit: number): Promise<VisibleHistoryEntry[]> {
		return this.findWithCourse<VisibleHistoryEntry>(
			{ userId, visibility: 'visible' },
			AcademicHistoryRepository.VISIBLE_ENTRY_FIELDS,
			limit
		);
	}

	/** Joins each entry with its course and school. Entries whose course is gone are dropped. */
	private findWithCourse<Entry extends Document>(
		filter: Filter<AcademicHistoryEntryDocument>,
		entryFields: Record<string, 1>,
		limit: number
	): Promise<Entry[]> {
		return this.collection()
			.aggregate<Entry>([
				{ $match: filter },
				{ $sort: { createdAt: -1 } },
				{ $limit: limit },
				{ $project: { ...entryFields, courseId: 1 } },
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
						...entryFields,
						course: {
							courseId: '$course._id',
							code: '$course.code',
							title: '$course.title',
							institutionId: '$institution._id',
							institutionName: '$institution.name'
						}
					}
				}
			])
			.toArray();
	}
}

export const academicHistoryRepository = new AcademicHistoryRepository();
