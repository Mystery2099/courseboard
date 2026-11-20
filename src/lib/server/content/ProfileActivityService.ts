import { ObjectId } from 'mongodb';
import { THREAD_KINDS } from '#lib/contracts/PostContract.ts';
import {
	profileActivityQuerySchema,
	type ProfileActivityPageResponse
} from '#lib/contracts/ProfileActivityContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { TimestampIdCursor } from '#lib/server/persistence/TimestampIdCursor.ts';
import { SearchSnippet } from '#lib/server/search/SearchSnippet.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	authorActivityRepository,
	type AuthorActivityRepository
} from './AuthorActivityRepository.ts';

/**
 * The caller's own posts, replies, and reviews for their profile. The author is always the caller,
 * so this can't list anyone else's activity.
 */
export class ProfileActivityService {
	private static readonly PAGE_SIZE = 20;

	constructor(private readonly activity: AuthorActivityRepository) {}

	async listOwnActivity(
		query: unknown,
		actor: ApplicationUser | null
	): Promise<ProfileActivityPageResponse> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const { type, after } = profileActivityQuerySchema.parse(query);
		const authorId = new ObjectId(user.id);
		const position = after ? TimestampIdCursor.parse(after) : null;
		const pageSize = ProfileActivityService.PAGE_SIZE;

		if (type === 'replies') {
			const rows = await this.activity.findReplies(authorId, position, pageSize + 1);
			const page = rows.slice(0, pageSize);
			return {
				type,
				replies: page.flatMap(({ post, ...reply }) =>
					post
						? [
								{
									id: reply._id.toHexString(),
									course: { id: post.courseId.toHexString(), code: post.courseCode },
									postId: reply.postId.toHexString(),
									postKind: post.kind,
									postTitle: post.title,
									excerpt: SearchSnippet.around(reply.bodyMarkdown, ''),
									createdAt: reply.createdAt.toISOString()
								}
							]
						: []
				),
				// From the last reply read, even when it was left out, so the next page moves on.
				nextCursor: ProfileActivityService.nextCursor(page, rows.length > pageSize)
			};
		}

		const rows = await this.activity.findPosts(
			authorId,
			type === 'reviews' ? ['review'] : THREAD_KINDS,
			position,
			pageSize + 1
		);
		const page = rows.slice(0, pageSize);
		return {
			type,
			posts: page.map((post) => ({
				id: post._id.toHexString(),
				course: { id: post.courseId.toHexString(), code: post.courseCode },
				kind: post.kind,
				title: post.title,
				replyCount: post.replyCount,
				createdAt: post.createdAt.toISOString(),
				...(post.reviewData && { reviewData: post.reviewData })
			})),
			nextCursor: ProfileActivityService.nextCursor(page, rows.length > pageSize)
		};
	}

	private static nextCursor(
		page: { _id: ObjectId; createdAt: Date }[],
		hasMore: boolean
	): string | null {
		const last = page.at(-1);
		return last && hasMore ? TimestampIdCursor.format(last.createdAt, last._id) : null;
	}
}

export const profileActivityService = new ProfileActivityService(authorActivityRepository);
