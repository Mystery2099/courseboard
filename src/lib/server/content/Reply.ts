import type { ObjectId } from 'mongodb';
import type { ContentAuthor } from './Post.ts';

export const REPLIES_COLLECTION_NAME = 'replies';

export interface ReplyDocument {
	_id: ObjectId;
	postId: ObjectId;
	/** A top-level reply of the same post, or null. Replies nest one level at most. */
	parentReplyId: ObjectId | null;
	authorId: ObjectId;
	bodyMarkdown: string;
	/** Chosen by the client and unique per author, so a retried submission is stored once. */
	submissionId: string;
	createdAt: Date;
}

export interface ReplyWithAuthor extends Pick<
	ReplyDocument,
	'_id' | 'postId' | 'parentReplyId' | 'bodyMarkdown' | 'createdAt'
> {
	author: ContentAuthor;
}

export type ReplyPlacement = Pick<ReplyDocument, 'postId' | 'parentReplyId'>;
