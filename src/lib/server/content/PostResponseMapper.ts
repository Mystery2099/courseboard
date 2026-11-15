import type {
	PostDetailResponse,
	PostSummaryResponse
} from '#lib/contracts/PostContract.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDetail, PostSummary } from './Post.ts';

/** Shared HTTP representations for general posts and reviews. */
export class PostResponseMapper {
	static toSummaryResponse(post: PostSummary): PostSummaryResponse {
		return {
			id: post._id.toHexString(),
			courseId: post.courseId.toHexString(),
			kind: post.kind,
			title: post.title,
			author: post.author,
			createdAt: post.createdAt.toISOString(),
			lastActivityAt: post.lastActivityAt.toISOString(),
			replyCount: post.replyCount,
			hasAcceptedReply: post.acceptedReplyId !== null,
			isLocked: post.lockedAt !== null,
			...(post.reviewData && { reviewData: post.reviewData }),
			...(post.editedAt && { editedAt: post.editedAt.toISOString() })
		};
	}

	static toDetailResponse(post: PostDetail, viewer: ApplicationUser): PostDetailResponse {
		const isAuthor = post.authorId.toHexString() === viewer.id;
		return {
			...PostResponseMapper.toSummaryResponse(post),
			bodyMarkdown: post.bodyMarkdown,
			acceptedReplyId: post.acceptedReplyId?.toHexString() ?? null,
			viewerPermissions: {
				canChooseAcceptedReply: post.kind === 'question' && isAuthor,
				canLock: viewer.role === 'administrator',
				canEditReview: post.kind === 'review' && isAuthor
			}
		};
	}
}
