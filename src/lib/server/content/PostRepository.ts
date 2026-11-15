import type { ClientSession, Collection, Filter, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { CONTENT_AUTHOR_LOOKUP_STAGES } from './ContentAuthorLookup.ts';
import {
	POSTS_COLLECTION_NAME,
	type PostDetail,
	type PostDocument,
	type PostPageCriteria,
	type PostSummary
} from './Post.ts';

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
				...CONTENT_AUTHOR_LOOKUP_STAGES,
				{ $project: PostRepository.SUMMARY_FIELDS }
			])
			.toArray();
	}

	async findById(postId: ObjectId): Promise<PostDetail | null> {
		const [post] = await this.collection()
			.aggregate<PostDetail>([
				{ $match: { _id: postId } },
				...CONTENT_AUTHOR_LOOKUP_STAGES,
				{ $project: { ...PostRepository.SUMMARY_FIELDS, bodyMarkdown: 1 } }
			])
			.toArray();
		return post ?? null;
	}

	async exists(postId: ObjectId): Promise<boolean> {
		return (await this.collection().countDocuments({ _id: postId }, { limit: 1 })) === 1;
	}

	/**
	 * Counts a new reply and advances the thread's activity. Matches only an unlocked post, so a
	 * reply can't slip in while the thread is being locked. Returns false when nothing matched.
	 */
	async recordReply(postId: ObjectId, repliedAt: Date, session: ClientSession): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: postId, lockedAt: null },
			{ $inc: { replyCount: 1 }, $set: { lastActivityAt: repliedAt } },
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
