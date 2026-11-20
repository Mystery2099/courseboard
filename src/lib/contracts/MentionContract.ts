import { z } from 'zod';
import type { PostAuthorResponse, PostKind } from './PostContract.ts';

/** The most people one post or reply can mention; later mentions stay plain text. */
export const MENTIONS_PER_BODY_LIMIT = 10;

export const mentionListQuerySchema = z.object({
	/** The `nextCursor` of the previous page: a timestamp and a post or reply id. */
	after: z
		.string()
		.regex(/^\d{1,15}_[a-f0-9]{24}$/)
		.optional()
});

/** How many people the `@` list offers at once. */
export const MENTION_SUGGESTION_LIMIT = 6;

/** What follows an `@` while it's being typed, the longest a username can be. */
export const mentionSuggestionQuerySchema = z.object({
	prefix: z.string().regex(/^[A-Za-z0-9_]{1,24}$/)
});

/** Someone the signed-in user can mention. */
export interface MentionSuggestionResponse {
	username: string;
	displayName: string;
}

export interface MentionSuggestionListResponse {
	/** Username matches first, then display-name matches; never the signed-in user. */
	suggestions: MentionSuggestionResponse[];
}

/** A post or reply that mentions the signed-in user. */
export interface MentionResponse {
	/** The id of the post or reply that holds the mention. */
	id: string;
	courseId: string;
	courseCode: string;
	postId: string;
	/** Null when the post itself holds the mention. */
	replyId: string | null;
	postKind: PostKind;
	postTitle: string;
	author: PostAuthorResponse;
	/** Plain text around the mention, cut on the server. */
	excerpt: string;
	createdAt: string;
}

export interface MentionListResponse {
	/** Newest first. */
	mentions: MentionResponse[];
	/** Pass as `after` to load the next page; null on the last page. */
	nextCursor: string | null;
}
