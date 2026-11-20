import type { Collection, Filter, ObjectId } from 'mongodb';
import { REVIEW_WORKLOADS } from '#lib/contracts/PostContract.ts';
import type {
	ReviewStatisticsResponse,
	UpdateReviewRequest
} from '#lib/contracts/ReviewContract.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { TimestampIdCursor } from '#lib/server/persistence/TimestampIdCursor.ts';
import { ContentAuthorLookup } from './ContentAuthorLookup.ts';
import {
	POSTS_COLLECTION_NAME,
	POST_SUMMARY_FIELDS,
	VISIBLE_POST_FILTER,
	type PostDocument,
	type PostOrderField,
	type PostPagePosition,
	type PostSummary,
	type ReviewPageCriteria
} from './Post.ts';

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
		// A course's reviews filtered by workload and would-take-again, one index per date order.
		// `findPage` names each pair of the two as its own `$or` branch, so MongoDB merges the sorted
		// runs instead of sorting in memory, also when ordering by workload.
		for (const orderedBy of ['createdAt', 'lastActivityAt'] satisfies PostOrderField[]) {
			await this.collection().createIndex(
				{
					courseId: 1,
					'reviewData.workload': 1,
					'reviewData.wouldTakeAgain': 1,
					[orderedBy]: -1,
					_id: -1
				},
				{ partialFilterExpression: { kind: 'review' }, name: `review_filters_by_${orderedBy}` }
			);
		}
	}

	/** One page of a course's published reviews, without their bodies. */
	async findPage(criteria: ReviewPageCriteria, limit: number): Promise<PostSummary[]> {
		const { order, after } = criteria;
		const orderedBy: PostOrderField = order === 'active' ? 'lastActivityAt' : 'createdAt';
		const workloadDirection =
			order === 'highest-workload' ? -1 : order === 'lowest-workload' ? 1 : 0;
		const workloads = criteria.workload === null ? REVIEW_WORKLOADS : [criteria.workload];
		const answers = criteria.wouldTakeAgain === null ? [false, true] : [criteria.wouldTakeAgain];

		const branches: Filter<PostDocument>[] = [];
		for (const workload of workloads) {
			let pagePosition: PostPagePosition | null = after;
			if (after && workloadDirection !== 0) {
				const workloadsApart = (workload - (after.workload ?? 0)) * workloadDirection;
				// Workloads before the cursor's are done, and later ones start from their newest review.
				if (workloadsApart < 0) continue;
				if (workloadsApart > 0) pagePosition = null;
			}
			for (const wouldTakeAgain of answers) {
				branches.push({
					courseId: criteria.courseId,
					kind: 'review',
					...VISIBLE_POST_FILTER,
					'reviewData.workload': workload,
					'reviewData.wouldTakeAgain': wouldTakeAgain,
					...(pagePosition &&
						TimestampIdCursor.olderThan(orderedBy, {
							at: pagePosition.orderedAt,
							id: pagePosition.postId
						}))
				});
			}
		}
		if (branches.length === 0) return [];

		return this.collection()
			.aggregate<PostSummary>([
				{ $match: branches.length === 1 ? branches[0] : { $or: branches } },
				{
					$sort:
						workloadDirection === 0
							? { [orderedBy]: -1, _id: -1 }
							: { 'reviewData.workload': workloadDirection, createdAt: -1, _id: -1 }
				},
				{ $limit: limit },
				...ContentAuthorLookup.STAGES,
				{ $project: POST_SUMMARY_FIELDS }
			])
			.toArray();
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
