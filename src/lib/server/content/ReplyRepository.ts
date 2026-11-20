import type { ClientSession, Collection, Filter, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { ContentAuthorLookup } from './ContentAuthorLookup.ts';
import {
	REPLIES_COLLECTION_NAME,
	type ReplyDocument,
	type ReplyPlacement,
	type ReplyWithAuthor
} from './Reply.ts';

export class ReplyRepository {
	private static readonly REPLY_FIELDS = {
		postId: 1,
		parentReplyId: 1,
		bodyMarkdown: 1,
		createdAt: 1,
		mentions: 1,
		author: 1
	} as const;

	private collection(): Collection<ReplyDocument> {
		return mongoClientProvider.getDatabase().collection<ReplyDocument>(REPLIES_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// A thread's replies in the order they were written; ObjectIds sort by creation time.
		await this.collection().createIndex({ postId: 1, _id: 1 });
		await this.collection().createIndex({ authorId: 1, submissionId: 1 }, { unique: true });
	}

	async insert(reply: ReplyDocument, session: ClientSession): Promise<void> {
		await this.collection().insertOne(reply, { session });
	}

	/** One page of a thread's replies, oldest first, starting after `afterReplyId`. */
	async findPage(
		postId: ObjectId,
		afterReplyId: ObjectId | null,
		limit: number
	): Promise<ReplyWithAuthor[]> {
		return this.findWithAuthor(
			afterReplyId ? { postId, _id: { $gt: afterReplyId } } : { postId },
			limit
		);
	}

	async findBySubmission(
		authorId: ObjectId,
		submissionId: string
	): Promise<ReplyWithAuthor | null> {
		const [reply] = await this.findWithAuthor({ authorId, submissionId }, 1);
		return reply ?? null;
	}

	async findPlacement(replyId: ObjectId): Promise<ReplyPlacement | null> {
		return this.collection().findOne(
			{ _id: replyId },
			{ projection: { _id: 0, postId: 1, parentReplyId: 1 } }
		);
	}

	private findWithAuthor(filter: Filter<ReplyDocument>, limit: number): Promise<ReplyWithAuthor[]> {
		return this.collection()
			.aggregate<ReplyWithAuthor>([
				{ $match: filter },
				{ $sort: { _id: 1 } },
				{ $limit: limit },
				...ContentAuthorLookup.STAGES,
				{ $project: ReplyRepository.REPLY_FIELDS }
			])
			.toArray();
	}
}

export const replyRepository = new ReplyRepository();
