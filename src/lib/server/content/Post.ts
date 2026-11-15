import type { ObjectId } from 'mongodb';
import type { PostKind } from '#lib/contracts/PostContract.ts';
import type { ReviewData } from '#lib/contracts/ReviewContract.ts';

export const POSTS_COLLECTION_NAME = 'posts';

/**
 * A question, discussion, or review in a course space. Replies live in their own collection, because a
 * thread's replies are unbounded and paged; the post keeps only their count and the accepted one.
 */
export interface PostDocument {
	_id: ObjectId;
	spaceId: ObjectId;
	/** Copied from the space, so links and course queries don't need a join. */
	courseId: ObjectId;
	kind: PostKind;
	authorId: ObjectId;
	title: string;
	bodyMarkdown: string;
	replyCount: number;
	/** Chosen by a question's author; always null on discussions and reviews. */
	acceptedReplyId: ObjectId | null;
	/** Null while replies are allowed. */
	lockedAt: Date | null;
	createdAt: Date;
	/** Advances on creation and new replies only, never on accepting or locking. */
	lastActivityAt: Date;
	/** Older questions and discussions have no state and are treated as published. */
	state?: 'published' | 'removed' | 'deleted';
	reviewData?: ReviewData;
	editedAt?: Date;
}

export interface ContentAuthor {
	username: string;
	displayName: string;
}

export interface PostSummary extends Pick<
	PostDocument,
	| '_id'
	| 'courseId'
	| 'kind'
	| 'authorId'
	| 'title'
	| 'replyCount'
	| 'acceptedReplyId'
	| 'lockedAt'
	| 'createdAt'
	| 'lastActivityAt'
	| 'reviewData'
	| 'editedAt'
> {
	author: ContentAuthor;
}

export interface PostDetail extends PostSummary {
	bodyMarkdown: string;
}

export type PostOrderField = 'lastActivityAt' | 'createdAt';

/** Where the previous page ended: the ordering date of its last post, with the id as tie-breaker. */
export interface PostPagePosition {
	orderedAt: Date;
	postId: ObjectId;
}

export interface PostPageCriteria {
	spaceId: ObjectId;
	kinds: readonly PostKind[];
	orderedBy: PostOrderField;
	onlyWithoutReplies: boolean;
	after: PostPagePosition | null;
}
