import type { Collection, Document, ObjectId } from 'mongodb';
import type { PostKind } from '#lib/contracts/PostContract.ts';
import { COURSES_COLLECTION_NAME } from '#lib/server/catalog/Course.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import {
	TimestampIdCursor,
	type TimestampIdPosition
} from '#lib/server/persistence/TimestampIdCursor.ts';
import { POSTS_COLLECTION_NAME, VISIBLE_POST_FILTER, type PostDocument } from './Post.ts';
import { REPLIES_COLLECTION_NAME, type ReplyDocument } from './Reply.ts';

export interface AuthorPostRow extends Pick<
	PostDocument,
	'_id' | 'courseId' | 'kind' | 'title' | 'replyCount' | 'createdAt' | 'reviewData'
> {
	courseCode: string;
}

export interface AuthorReplyRow extends Pick<
	ReplyDocument,
	'_id' | 'postId' | 'bodyMarkdown' | 'createdAt'
> {
	/** Null when the post was removed or deleted, so nobody can open the reply any more. */
	post: {
		courseId: ObjectId;
		courseCode: string;
		kind: PostKind;
		title: string;
	} | null;
}

/** One author's own posts and replies, newest first, for their profile. */
export class AuthorActivityRepository {
	private static readonly COURSE_CODE_STAGES: readonly Document[] = [
		{
			$lookup: {
				from: COURSES_COLLECTION_NAME,
				localField: 'courseId',
				foreignField: '_id',
				as: 'course',
				pipeline: [{ $project: { _id: 0, code: 1 } }]
			}
		},
		{ $unwind: '$course' }
	];

	private posts(): Collection<PostDocument> {
		return mongoClientProvider.getDatabase().collection<PostDocument>(POSTS_COLLECTION_NAME);
	}

	private replies(): Collection<ReplyDocument> {
		return mongoClientProvider.getDatabase().collection<ReplyDocument>(REPLIES_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// With `kind` as an `$in`, MongoDB merges the questions and discussions runs in date order.
		await this.posts().createIndex({ authorId: 1, kind: 1, createdAt: -1, _id: -1 });
		await this.replies().createIndex({ authorId: 1, createdAt: -1, _id: -1 });
	}

	async findPosts(
		authorId: ObjectId,
		kinds: readonly PostKind[],
		after: TimestampIdPosition | null,
		limit: number
	): Promise<AuthorPostRow[]> {
		return this.posts()
			.aggregate<AuthorPostRow>([
				{
					$match: {
						authorId,
						kind: { $in: [...kinds] },
						...VISIBLE_POST_FILTER,
						...(after && TimestampIdCursor.olderThan('createdAt', after))
					}
				},
				{ $sort: { createdAt: -1, _id: -1 } },
				{ $limit: limit },
				...AuthorActivityRepository.COURSE_CODE_STAGES,
				{
					$project: {
						courseId: 1,
						kind: 1,
						title: 1,
						replyCount: 1,
						createdAt: 1,
						reviewData: 1,
						courseCode: '$course.code'
					}
				}
			])
			.toArray();
	}

	/**
	 * Limited before joining the posts, so a page reads at most `limit` replies. A reply under a
	 * removed or deleted post comes back with a null `post`, for the caller to leave out.
	 */
	async findReplies(
		authorId: ObjectId,
		after: TimestampIdPosition | null,
		limit: number
	): Promise<AuthorReplyRow[]> {
		return this.replies()
			.aggregate<AuthorReplyRow>([
				{ $match: { authorId, ...(after && TimestampIdCursor.olderThan('createdAt', after)) } },
				{ $sort: { createdAt: -1, _id: -1 } },
				{ $limit: limit },
				{
					$lookup: {
						from: POSTS_COLLECTION_NAME,
						localField: 'postId',
						foreignField: '_id',
						as: 'post',
						pipeline: [
							{ $match: VISIBLE_POST_FILTER },
							...AuthorActivityRepository.COURSE_CODE_STAGES,
							{
								$project: {
									_id: 0,
									courseId: 1,
									kind: 1,
									title: 1,
									courseCode: '$course.code'
								}
							}
						]
					}
				},
				{
					$project: {
						postId: 1,
						bodyMarkdown: 1,
						createdAt: 1,
						post: { $ifNull: [{ $first: '$post' }, null] }
					}
				}
			])
			.toArray();
	}
}

export const authorActivityRepository = new AuthorActivityRepository();
