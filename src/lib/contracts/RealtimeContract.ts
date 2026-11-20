import { z } from 'zod';
import { objectIdSchema } from './ApiContract.ts';
import type { PostKind } from './PostContract.ts';

/**
 * Socket.IO messages. Events carry IDs only; clients load the content itself over HTTP with their
 * own permissions, so an event can never show someone something they couldn't read.
 */
export const REALTIME_MESSAGES = {
	subscribeToCourse: 'course.subscribe',
	unsubscribeFromCourse: 'course.unsubscribe',
	postCreated: 'post.created',
	replyCreated: 'reply.created',
	reactionChanged: 'reaction.changed',
	mentionCreated: 'mention.created'
} as const;

export const courseSubscriptionRequestSchema = z.object({ courseId: objectIdSchema });

export type CourseSubscriptionRefusalReason =
	'invalid-request' | 'course-not-found' | 'access-denied' | 'superseded' | 'unavailable';

/** The acknowledgement of a subscription request. */
export type CourseSubscriptionResult =
	{ kind: 'subscribed' } | { kind: 'refused'; reason: CourseSubscriptionRefusalReason };

export interface PostCreatedEvent {
	courseId: string;
	postId: string;
	kind: PostKind;
}

export interface ReplyCreatedEvent {
	courseId: string;
	postId: string;
	replyId: string;
}

/** Someone added or removed a reaction somewhere in the thread; the open thread refetches its counts. */
export interface ReactionChangedEvent {
	courseId: string;
	postId: string;
}

/** Sent only to the mentioned person's own connections, whatever course they have open. */
export interface MentionCreatedEvent {
	courseId: string;
	postId: string;
	postKind: PostKind;
	/** Null when the post itself holds the mention. */
	replyId: string | null;
}
