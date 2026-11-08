import type { ClientSession, Collection, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { COURSES_COLLECTION_NAME, type CourseDocument } from './Course.ts';

export type CourseSummary = Pick<CourseDocument, '_id' | 'code' | 'normalizedCode' | 'title' | 'spaceId'>;

export type CourseDetail = CourseSummary & Pick<CourseDocument, 'institutionId' | 'description'>;

export class CourseRepository {
	private static readonly SUMMARY_PROJECTION = {
		code: 1,
		normalizedCode: 1,
		title: 1,
		spaceId: 1
	} as const;

	private collection(): Collection<CourseDocument> {
		return mongoClientProvider.getDatabase().collection<CourseDocument>(COURSES_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// Also serves browsing one institution's courses in code order.
		await this.collection().createIndex({ institutionId: 1, normalizedCode: 1 }, { unique: true });
	}

	/** One page of an institution's courses in code order, starting after `afterNormalizedCode`. */
	async findPageByInstitution(
		institutionId: ObjectId,
		afterNormalizedCode: string | undefined,
		limit: number
	): Promise<CourseSummary[]> {
		const filter = afterNormalizedCode
			? { institutionId, normalizedCode: { $gt: afterNormalizedCode } }
			: { institutionId };
		return this.collection()
			.find(filter, {
				projection: CourseRepository.SUMMARY_PROJECTION,
				sort: { normalizedCode: 1 },
				limit
			})
			.toArray();
	}

	async findById(courseId: ObjectId): Promise<CourseDetail | null> {
		return this.collection().findOne(
			{ _id: courseId },
			{
				projection: { ...CourseRepository.SUMMARY_PROJECTION, institutionId: 1, description: 1 }
			}
		);
	}

	async findSpaceId(courseId: ObjectId): Promise<ObjectId | null> {
		const course = await this.collection().findOne(
			{ _id: courseId },
			{ projection: { spaceId: 1 } }
		);
		return course?.spaceId ?? null;
	}

	async existsByCode(institutionId: ObjectId, normalizedCode: string): Promise<boolean> {
		const course = await this.collection().findOne(
			{ institutionId, normalizedCode },
			{ projection: { _id: 1 } }
		);
		return course !== null;
	}

	async insert(course: CourseDocument, session: ClientSession): Promise<void> {
		await this.collection().insertOne(course, { session });
	}
}

export const courseRepository = new CourseRepository();
