import type { Collection, Document, ObjectId } from 'mongodb';
import type { PostKind } from '#lib/contracts/PostContract.ts';
import { COURSES_COLLECTION_NAME } from '#lib/server/catalog/Course.ts';
import { ContentAuthorLookup } from '#lib/server/content/ContentAuthorLookup.ts';
import {
	POSTS_COLLECTION_NAME,
	type ContentAuthor,
	type PostDocument
} from '#lib/server/content/Post.ts';
import { REPLIES_COLLECTION_NAME, type ReplyDocument } from '#lib/server/content/Reply.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';

/** Where the previous page ended: the creation date of its last mention, with its id as tie-breaker. */
export interface MentionPagePosition {
	createdAt: Date;
	id: ObjectId;
}

export interface MentionRow {
	/** The post or reply that holds the mention. */
	_id: ObjectId;
	courseId: ObjectId;
	courseCode: string;
	postId: ObjectId;
	replyId: ObjectId | null;
	postKind: PostKind;
	postTitle: string;
	bodyMarkdown: string;
	createdAt: Date;
	author: ContentAuthor;
}

/**
 * Reads mentions from where they're stored, on posts and replies. Both collections index
 * `mentions.userId` with the creation date, so each side of a page is an index range.
 */
export class MentionRepository {
	private static readonly VISIBLE_POST_FILTER = { state: { $nin: ['removed', 'deleted'] } };

	private posts(): Collection<PostDocument> {
		return mongoClientProvider.getDatabase().collection<PostDocument>(POSTS_COLLECTION_NAME);
	}

	private replies(): Collection<ReplyDocument> {
		return mongoClientProvider.getDatabase().collection<ReplyDocument>(REPLIES_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		const mentionOrder = { 'mentions.userId': 1, createdAt: -1, _id: -1 } as const;
		await this.posts().createIndex(mentionOrder);
		await this.replies().createIndex(mentionOrder);
	}

	/**
	 * One page of the posts and replies that mention `userId`, newest first. Removed and deleted
	 * posts, and replies on them, are left out.
	 */
	async findPage(
		userId: ObjectId,
		after: MentionPagePosition | null,
		limit: number
	): Promise<MentionRow[]> {
		const pageFilter: Document = {
			'mentions.userId': userId,
			...(after && {
				$or: [
					{ createdAt: { $lt: after.createdAt } },
					{ createdAt: after.createdAt, _id: { $lt: after.id } }
				]
			})
		};
		const newestFirst = { $sort: { createdAt: -1, _id: -1 } };
		return this.posts()
			.aggregate<MentionRow>([
				{ $match: { ...pageFilter, ...MentionRepository.VISIBLE_POST_FILTER } },
				newestFirst,
				{ $limit: limit },
				{
					$project: {
						courseId: 1,
						postId: '$_id',
						replyId: { $literal: null },
						postKind: '$kind',
						postTitle: '$title',
						bodyMarkdown: 1,
						createdAt: 1,
						authorId: 1
					}
				},
				{
					$unionWith: {
						coll: REPLIES_COLLECTION_NAME,
						pipeline: [
							{ $match: pageFilter },
							newestFirst,
							{
								$lookup: {
									from: POSTS_COLLECTION_NAME,
									localField: 'postId',
									foreignField: '_id',
									as: 'post',
									pipeline: [
										{ $match: MentionRepository.VISIBLE_POST_FILTER },
										{ $project: { _id: 0, courseId: 1, kind: 1, title: 1 } }
									]
								}
							},
							{ $unwind: '$post' },
							{ $limit: limit },
							{
								$project: {
									courseId: '$post.courseId',
									postId: 1,
									replyId: '$_id',
									postKind: '$post.kind',
									postTitle: '$post.title',
									bodyMarkdown: 1,
									createdAt: 1,
									authorId: 1
								}
							}
						]
					}
				},
				newestFirst,
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
				{ $set: { courseCode: '$course.code' } },
				{ $project: { course: 0, authorId: 0 } }
			])
			.toArray();
	}
}

export const mentionRepository = new MentionRepository();
