import { z } from 'zod';
import { MULTILINE_TEXT_PATTERN, objectIdSchema } from './ApiContract.ts';
import type { ReviewData } from './ReviewContract.ts';

/** Questions and discussions use the general composer; reviews have their own publishing rules. */
export const THREAD_KINDS = ['question', 'discussion'] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];
export const POST_KINDS = [...THREAD_KINDS, 'review'] as const;
export type PostKind = (typeof POST_KINDS)[number];

/** `active` orders by latest reply or creation; `unanswered` lists questions without replies. */
export const POST_LIST_FILTERS = ['active', 'newest', 'unanswered'] as const;
export type PostListFilter = (typeof POST_LIST_FILTERS)[number];

export const POST_TITLE_MAX_LENGTH = 150;
export const POST_BODY_MAX_LENGTH = 10_000;
export const REPLY_BODY_MAX_LENGTH = 5_000;

export const postIdSchema = objectIdSchema;

const titleSchema = z
	.string()
	.trim()
	.min(1, 'Enter a title.')
	.max(POST_TITLE_MAX_LENGTH, `Use ${POST_TITLE_MAX_LENGTH} characters or fewer.`)
	.regex(/^[^\p{Cc}\p{Cs}]*$/u, 'Keep the title on one line.');

function bodySchema(maxLength: number) {
	return z
		.string()
		.trim()
		.min(1, 'Write something first.')
		.max(maxLength, `Use ${maxLength.toLocaleString('en-US')} characters or fewer.`)
		.regex(MULTILINE_TEXT_PATTERN, 'Remove control characters.');
}

export const createPostSchema = z.object({
	kind: z.enum(THREAD_KINDS),
	title: titleSchema,
	bodyMarkdown: bodySchema(POST_BODY_MAX_LENGTH)
});

export type CreatePostRequest = z.infer<typeof createPostSchema>;

export const postListQuerySchema = z
	.object({
		/** Left out on the course overview, which lists every kind. */
		kind: z.enum(POST_KINDS).optional(),
		filter: z.enum(POST_LIST_FILTERS).default('active'),
		/** The `nextCursor` of the previous page: a timestamp and a post id. */
		after: z
			.string()
			.regex(/^\d{1,15}_[a-f0-9]{24}$/)
			.optional()
	})
	.refine((query) => query.filter !== 'unanswered' || query.kind === 'question', {
		path: ['filter'],
		message: 'Only questions can be filtered by unanswered.'
	});

export type PostListQuery = z.input<typeof postListQuerySchema>;

export const createReplySchema = z.object({
	bodyMarkdown: bodySchema(REPLY_BODY_MAX_LENGTH),
	/** A top-level reply of the same post. Replies nest one level, so a nested reply can't be a parent. */
	parentReplyId: objectIdSchema.nullable().default(null),
	/** Chosen once per reply by the client and reused on Retry, so a retry never stores a duplicate. */
	submissionId: z.uuid()
});

export type CreateReplyRequest = z.input<typeof createReplySchema>;

export const replyListQuerySchema = z.object({
	/** The `nextCursor` of the previous page. */
	after: objectIdSchema.optional()
});

export const acceptReplySchema = z.object({ replyId: objectIdSchema });

export interface PostAuthorResponse {
	username: string;
	displayName: string;
}

export interface PostSummaryResponse {
	id: string;
	courseId: string;
	kind: PostKind;
	title: string;
	author: PostAuthorResponse;
	createdAt: string;
	/** Advances on creation and new replies only. */
	lastActivityAt: string;
	replyCount: number;
	hasAcceptedReply: boolean;
	isLocked: boolean;
	reviewData?: ReviewData;
	editedAt?: string;
}

export interface PostListResponse {
	posts: PostSummaryResponse[];
	/** Pass as `after` to load the next page; null on the last page. */
	nextCursor: string | null;
}

export interface PostDetailResponse extends PostSummaryResponse {
	bodyMarkdown: string;
	acceptedReplyId: string | null;
	/** What the caller may do here, so the client shows only controls the server will accept. */
	viewerPermissions: {
		canChooseAcceptedReply: boolean;
		canLock: boolean;
		canEditReview: boolean;
	};
}

export interface ReplyResponse {
	id: string;
	postId: string;
	parentReplyId: string | null;
	author: PostAuthorResponse;
	bodyMarkdown: string;
	createdAt: string;
}

export interface ReplyListResponse {
	/** Ordered by id, which is chronological to the second. */
	replies: ReplyResponse[];
	/** Pass as `after` to load the next page; null on the last page. */
	nextCursor: string | null;
}

export type PostCreationResult =
	{ kind: 'created'; post: PostDetailResponse } | { kind: 'course-not-found' };

export type ReplyCreationResult =
	| { kind: 'created'; reply: ReplyResponse }
	| { kind: 'post-not-found' }
	| { kind: 'post-locked' }
	| { kind: 'parent-reply-unavailable' };

export type AcceptedReplyChangeResult =
	| { kind: 'changed'; post: PostDetailResponse }
	| { kind: 'post-not-found' }
	| { kind: 'not-a-question' }
	| { kind: 'reply-not-found' };
