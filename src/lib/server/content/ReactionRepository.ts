import type { Collection, ObjectId } from 'mongodb';
import type { ReactionEmoji } from '#lib/contracts/ReactionContract.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { MongoErrorClassifier } from '#lib/server/persistence/MongoErrorClassifier.ts';
import {
	REACTIONS_COLLECTION_NAME,
	type ReactionCount,
	type ReactionDocument,
	type ReactionTarget
} from './Reaction.ts';

export class ReactionRepository {
	private collection(): Collection<ReactionDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<ReactionDocument>(REACTIONS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// One of each emoji per person on each target. The `postId` prefix also serves a thread's counts.
		await this.collection().createIndex(
			{ postId: 1, replyId: 1, emoji: 1, userId: 1 },
			{ unique: true }
		);
	}

	/** Returns false when the person had already reacted with this emoji. */
	async insert(reaction: ReactionDocument): Promise<boolean> {
		try {
			await this.collection().insertOne(reaction);
			return true;
		} catch (cause) {
			if (MongoErrorClassifier.isDuplicateKeyError(cause)) return false;
			throw cause;
		}
	}

	/** Returns false when there was no such reaction. */
	async delete(target: ReactionTarget, userId: ObjectId, emoji: ReactionEmoji): Promise<boolean> {
		const result = await this.collection().deleteOne({ ...target, userId, emoji });
		return result.deletedCount === 1;
	}

	/** Per target and emoji in one thread, with whether `viewerId` is among the people counted. */
	async countForThread(postId: ObjectId, viewerId: ObjectId): Promise<ReactionCount[]> {
		return this.collection()
			.aggregate<ReactionCount>([
				{ $match: { postId } },
				{
					$group: {
						_id: { replyId: '$replyId', emoji: '$emoji' },
						count: { $sum: 1 },
						reactedByViewer: { $max: { $eq: ['$userId', viewerId] } }
					}
				},
				{
					$project: {
						_id: 0,
						replyId: '$_id.replyId',
						emoji: '$_id.emoji',
						count: 1,
						reactedByViewer: 1
					}
				}
			])
			.toArray();
	}
}

export const reactionRepository = new ReactionRepository();
