import type { Collection, ObjectId } from 'mongodb';
import type {
	ReviewStatisticsResponse,
	UpdateReviewRequest
} from '#lib/contracts/ReviewContract.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { POSTS_COLLECTION_NAME, type PostDocument } from './Post.ts';

/** Review-specific queries on posts. Statistics never join academic history or user records. */
export class ReviewRepository {
	private collection(): Collection<PostDocument> {
		return mongoClientProvider.getDatabase().collection<PostDocument>(POSTS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.collection().createIndex(
			{ courseId: 1, authorId: 1 },
			{ unique: true, partialFilterExpression: { kind: 'review' }, name: 'one_review_per_author' }
		);
	}

	/** Includes removed reviews so moderation can't be bypassed by publishing a replacement. */
	async findIdByAuthor(courseId: ObjectId, authorId: ObjectId): Promise<ObjectId | null> {
		const review = await this.collection().findOne(
			{ courseId, authorId, kind: 'review' },
			{ projection: { _id: 1 } }
		);
		return review?._id ?? null;
	}

	async getStatistics(courseId: ObjectId): Promise<ReviewStatisticsResponse> {
		const [statistics] = await this.collection()
			.aggregate<ReviewStatisticsResponse>([
				{ $match: { courseId, kind: 'review', state: 'published' } },
				{
					$group: {
						_id: null,
						reviewCount: { $sum: 1 },
						averageWorkload: { $avg: '$reviewData.workload' },
						wouldTakeAgainPercentage: {
							$avg: { $cond: ['$reviewData.wouldTakeAgain', 100, 0] }
						}
					}
				},
				{ $project: { _id: 0, reviewCount: 1, averageWorkload: 1, wouldTakeAgainPercentage: 1 } }
			])
			.toArray();
		return statistics ?? { reviewCount: 0, averageWorkload: null, wouldTakeAgainPercentage: null };
	}

	/** Dotted updates preserve the original participation snapshot and never advance activity. */
	async updateOwned(
		postId: ObjectId,
		authorId: ObjectId,
		changes: UpdateReviewRequest,
		editedAt: Date
	): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: postId, authorId, kind: 'review', state: 'published' },
			{
				$set: {
					title: changes.title,
					bodyMarkdown: changes.bodyMarkdown,
					'reviewData.workload': changes.workload,
					'reviewData.wouldTakeAgain': changes.wouldTakeAgain,
					editedAt
				}
			}
		);
		return result.matchedCount === 1;
	}
}

export const reviewRepository = new ReviewRepository();
