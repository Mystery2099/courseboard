import type { ClientSession, Collection, Filter, ObjectId } from 'mongodb';
import { COURSES_COLLECTION_NAME } from '#lib/server/catalog/Course.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { ContentAuthorLookup } from './ContentAuthorLookup.ts';
import {
	POSTS_COLLECTION_NAME,
	type PostDetail,
	type PostDocument,
	type PostPageCriteria,
	type PostSummary
} from './Post.ts';

export interface PostSearchRow {
	_id: ObjectId;
	courseId: ObjectId;
	courseCode: string;
	kind: PostDocument['kind'];
	title: string;
	bodyMarkdown: string;
	lastActivityAt: Date;
	authorDisplayName: string;
}

export class PostRepository {
	private static readonly SUMMARY_FIELDS = {
		courseId: 1,
		kind: 1,
		authorId: 1,
		title: 1,
		replyCount: 1,
		acceptedReplyId: 1,
		lockedAt: 1,
		createdAt: 1,
		lastActivityAt: 1,
		reviewData: 1,
		editedAt: 1,
		author: 1
	} as const;

	private collection(): Collection<PostDocument> {
		return mongoClientProvider.getDatabase().collection<PostDocument>(POSTS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// Serves a course view ordered by activity. With `kind` as an `$in`, MongoDB merges the sorted
		// runs of each kind, so the overview uses it too.
		await this.collection().createIndex({ spaceId: 1, kind: 1, lastActivityAt: -1, _id: -1 });
		// Newest and Unanswered order by creation; without this they sort every post of the kind.
		await this.collection().createIndex({ spaceId: 1, kind: 1, createdAt: -1, _id: -1 });
		await this.collection().createIndex(
			{ title: 'text', bodyMarkdown: 'text' },
			{ name: 'post_text', weights: { title: 3, bodyMarkdown: 1 } }
		);
	}

	/**
	 * Published posts matching `text`, most relevant first, limited to `courseIds` when given. Rows
	 * include the body so the service can cut a snippet; the course code is joined in.
	 */
	async searchPublished(
		text: string,
		courseIds: ObjectId[] | null,
		skip: number,
		limit: number
	): Promise<PostSearchRow[]> {
		return this.collection()
			.aggregate<PostSearchRow>([
				{
					$match: {
						$text: { $search: text },
						state: { $nin: ['removed', 'deleted'] },
						...(courseIds && { courseId: { $in: courseIds } })
					}
				},
				{ $sort: { score: { $meta: 'textScore' }, lastActivityAt: -1, _id: -1 } },
				{ $skip: skip },
				{ $limit: limit },
				...ContentAuthorLookup.STAGES,
				{
					$lookup: {
						from: COURSES_COLLECTION_NAME,
						localField: 'courseId',
						foreignField: '_id',
						as: 'course',
						pipeline: [{ $project: { _id: 0, code: 1 } }]
					}
				},
				{ $unwind: '$course' },
				{
					$project: {
						courseId: 1,
						kind: 1,
						title: 1,
						bodyMarkdown: 1,
						lastActivityAt: 1,
						authorDisplayName: '$author.displayName',
						courseCode: '$course.code'
					}
				}
			])
			.toArray();
	}

	async insert(post: PostDocument): Promise<void> {
		await this.collection().insertOne(post);
	}

	/** One page of a space's posts, newest first by the chosen date, without their bodies. */
	async findPage(criteria: PostPageCriteria, limit: number): Promise<PostSummary[]> {
		const { orderedBy, after } = criteria;
		const filter: Filter<PostDocument> = {
			spaceId: criteria.spaceId,
			kind: { $in: [...criteria.kinds] },
			state: { $nin: ['removed', 'deleted'] },
			...(criteria.onlyWithoutReplies && { replyCount: 0 }),
			...(after && {
				$or: [
					{ [orderedBy]: { $lt: after.orderedAt } },
					{ [orderedBy]: after.orderedAt, _id: { $lt: after.postId } }
				]
			})
		};
		return this.collection()
			.aggregate<PostSummary>([
				{ $match: filter },
				{ $sort: { [orderedBy]: -1, _id: -1 } },
				{ $limit: limit },
				...ContentAuthorLookup.STAGES,
				{ $project: PostRepository.SUMMARY_FIELDS }
			])
			.toArray();
	}

	async findById(postId: ObjectId): Promise<PostDetail | null> {
		const [post] = await this.collection()
			.aggregate<PostDetail>([
				{ $match: { _id: postId, state: { $nin: ['removed', 'deleted'] } } },
				...ContentAuthorLookup.STAGES,
				{ $project: { ...PostRepository.SUMMARY_FIELDS, bodyMarkdown: 1, mentions: 1 } }
			])
			.toArray();
		return post ?? null;
	}

	/** The kind and course of a published post, without its author or body. */
	async findKindAndCourse(
		postId: ObjectId
	): Promise<Pick<PostDocument, 'kind' | 'courseId'> | null> {
		return this.collection().findOne(
			{ _id: postId, state: { $nin: ['removed', 'deleted'] } },
			{ projection: { _id: 0, kind: 1, courseId: 1 } }
		);
	}

	async exists(postId: ObjectId): Promise<boolean> {
		return (
			(await this.collection().countDocuments(
				{ _id: postId, state: { $nin: ['removed', 'deleted'] } },
				{ limit: 1 }
			)) === 1
		);
	}

	/**
	 * Counts a new reply and advances the thread's activity. Matches only an unlocked post, so a
	 * reply can't slip in while the thread is being locked. Returns false when nothing matched.
	 * `$max` keeps activity from moving backwards when concurrent replies commit out of order.
	 */
	async recordReply(postId: ObjectId, repliedAt: Date, session: ClientSession): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: postId, lockedAt: null, state: { $nin: ['removed', 'deleted'] } },
			{ $inc: { replyCount: 1 }, $max: { lastActivityAt: repliedAt } },
			{ session }
		);
		return result.matchedCount === 1;
	}

	/** Matches on the author and kind too, so only a question's author can change its answer. */
	async setAcceptedReply(
		postId: ObjectId,
		authorId: ObjectId,
		acceptedReplyId: ObjectId | null
	): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: postId, authorId, kind: 'question' },
			{ $set: { acceptedReplyId } }
		);
		return result.matchedCount === 1;
	}

	async setLockedAt(postId: ObjectId, lockedAt: Date | null): Promise<boolean> {
		const result = await this.collection().updateOne({ _id: postId }, { $set: { lockedAt } });
		return result.matchedCount === 1;
	}
}

export const postRepository = new PostRepository();
