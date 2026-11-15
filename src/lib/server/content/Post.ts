import type { ObjectId } from 'mongodb';
import type { ThreadKind } from '#lib/contracts/PostContract.ts';

export const POSTS_COLLECTION_NAME = 'posts';

/**
 * A question or discussion in a course space. Replies live in their own collection, because a
 * thread's replies are unbounded and paged; the post keeps only their count and the accepted one.
 */
export interface PostDocument {
	_id: ObjectId;
	spaceId: ObjectId;
	/** Copied from the space, so links and course queries don't need a join. */
	courseId: ObjectId;
	kind: ThreadKind;
	authorId: ObjectId;
	title: string;
	bodyMarkdown: string;
	replyCount: number;
	/** Chosen by a question's author; always null on discussions. */
	acceptedReplyId: ObjectId | null;
	/** Null while replies are allowed. */
	lockedAt: Date | null;
	createdAt: Date;
	/** Advances on creation and new replies only, never on accepting or locking. */
	lastActivityAt: Date;
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
	kinds: readonly ThreadKind[];
	orderedBy: PostOrderField;
	onlyWithoutReplies: boolean;
	after: PostPagePosition | null;
}
