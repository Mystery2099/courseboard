import { z } from 'zod';
import { timestampIdCursorSchema } from './ApiContract.ts';
import type { PostKind } from './PostContract.ts';
import type { ReviewData } from './ReviewContract.ts';

/** `posts` are questions and discussions; reviews have their own list. */
export const PROFILE_ACTIVITY_TYPES = ['posts', 'replies', 'reviews'] as const;
export type ProfileActivityType = (typeof PROFILE_ACTIVITY_TYPES)[number];

export const profileActivityQuerySchema = z.object({
	type: z.enum(PROFILE_ACTIVITY_TYPES),
	/** The `nextCursor` of the previous page: a timestamp and an id. */
	after: timestampIdCursorSchema.optional()
});

export interface ProfileActivityCourseResponse {
	id: string;
	code: string;
}

export interface ProfilePostActivityResponse {
	id: string;
	course: ProfileActivityCourseResponse;
	kind: PostKind;
	title: string;
	replyCount: number;
	createdAt: string;
	reviewData?: ReviewData;
}

export interface ProfileReplyActivityResponse {
	id: string;
	course: ProfileActivityCourseResponse;
	postId: string;
	postKind: PostKind;
	postTitle: string;
	/** About 160 characters of the reply as plain text. */
	excerpt: string;
	createdAt: string;
}

/**
 * Newest first. Pass `nextCursor` as `after` for the next page; null on the last page. A page of
 * replies can be short, or even empty, when some replies are under posts that were removed.
 */
export type ProfileActivityPageResponse =
	| {
			type: 'posts' | 'reviews';
			posts: ProfilePostActivityResponse[];
			nextCursor: string | null;
	  }
	| { type: 'replies'; replies: ProfileReplyActivityResponse[]; nextCursor: string | null };
