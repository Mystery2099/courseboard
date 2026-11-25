import { io, type Socket } from 'socket.io-client';
import {
	REALTIME_MESSAGES,
	type CourseSubscriptionResult,
	type MentionCreatedEvent,
	type PostCreatedEvent,
	type PostLockChangedEvent,
	type ReactionChangedEvent,
	type ReplyCreatedEvent
} from '#lib/contracts/RealtimeContract.ts';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'rejected';

/** Sent by the server while it is still starting. */
const SERVER_UNAVAILABLE_ERROR = 'unavailable';
const RETRY_DELAY_MILLISECONDS = 5_000;

/** Receives the events of the one course this tab listens to. */
export interface CourseActivityListener {
	onPostCreated(event: PostCreatedEvent): void;
	onPostLockChanged(event: PostLockChangedEvent): void;
	onReplyCreated(event: ReplyCreatedEvent): void;
	onReactionChanged(event: ReactionChangedEvent): void;
	/**
	 * Called each time the server confirms the subscription. Events sent before then, such as
	 * between loading the page and joining the room or while disconnected, never reach this tab.
	 */
	onSubscribed(): void;
}

interface CourseSubscription {
	courseId: string;
	listener: CourseActivityListener;
}

/**
 * The browser's authenticated Socket.IO connection. The Clerk session token is requested on every
 * connection attempt, because tokens expire within about a minute and must not be reused after a
 * reconnect. Data still comes from HTTP; events only tell the client what to refetch.
 *
 * The server forgets a socket's rooms when it disconnects, so the course subscription is requested
 * again on every connection.
 */
export class RealtimeConnection {
	status = $state<RealtimeConnectionStatus>('connecting');

	private readonly socket: Socket;
	private retryTimer: ReturnType<typeof setTimeout> | undefined;
	private lastTokenRequestFailed = false;
	private courseSubscription: CourseSubscription | null = null;
	// Listeners are callbacks, not state anything renders.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private readonly mentionListeners = new Set<(event: MentionCreatedEvent) => void>();

	constructor(sessionTokenProvider: () => Promise<string | null>) {
		this.socket = io({
			transports: ['websocket'],
			auth: (provideCredentials) => {
				sessionTokenProvider().then(
					(token) => {
						this.lastTokenRequestFailed = false;
						provideCredentials({ token });
					},
					() => {
						this.lastTokenRequestFailed = true;
						provideCredentials({ token: null });
					}
				);
			}
		});
		this.socket.on('connect', () => {
			this.status = 'connected';
			if (this.courseSubscription) this.requestCourseSubscription(this.courseSubscription);
		});
		this.socket.on(REALTIME_MESSAGES.postCreated, (event: PostCreatedEvent) => {
			if (event.courseId === this.courseSubscription?.courseId) {
				this.courseSubscription.listener.onPostCreated(event);
			}
		});
		this.socket.on(REALTIME_MESSAGES.postLockChanged, (event: PostLockChangedEvent) => {
			if (event.courseId === this.courseSubscription?.courseId) {
				this.courseSubscription.listener.onPostLockChanged(event);
			}
		});
		this.socket.on(REALTIME_MESSAGES.replyCreated, (event: ReplyCreatedEvent) => {
			if (event.courseId === this.courseSubscription?.courseId) {
				this.courseSubscription.listener.onReplyCreated(event);
			}
		});
		this.socket.on(REALTIME_MESSAGES.reactionChanged, (event: ReactionChangedEvent) => {
			if (event.courseId === this.courseSubscription?.courseId) {
				this.courseSubscription.listener.onReactionChanged(event);
			}
		});
		// Mentions reach this account wherever it is, not just in the course it has open.
		this.socket.on(REALTIME_MESSAGES.mentionCreated, (event: MentionCreatedEvent) => {
			for (const listener of this.mentionListeners) listener(event);
		});
		this.socket.on('disconnect', () => (this.status = 'disconnected'));
		this.socket.on('connect_error', (error) => this.handleConnectError(error));
	}

	/** Replaces any earlier course subscription. Returns a function that stops listening. */
	subscribeToCourse(courseId: string, listener: CourseActivityListener): () => void {
		const subscription: CourseSubscription = { courseId, listener };
		this.courseSubscription = subscription;
		// While disconnected, the `connect` handler sends it; Socket.IO would otherwise send it twice.
		if (this.socket.connected) this.requestCourseSubscription(subscription);
		return () => {
			if (this.courseSubscription !== subscription) return;
			this.courseSubscription = null;
			if (this.socket.connected) this.socket.emit(REALTIME_MESSAGES.unsubscribeFromCourse);
		};
	}

	/** Calls `listener` for each mention of this account. Returns a function that stops listening. */
	onMentionCreated(listener: (event: MentionCreatedEvent) => void): () => void {
		this.mentionListeners.add(listener);
		return () => this.mentionListeners.delete(listener);
	}

	close(): void {
		clearTimeout(this.retryTimer);
		this.socket.disconnect();
	}

	private requestCourseSubscription(subscription: CourseSubscription): void {
		this.socket.emit(
			REALTIME_MESSAGES.subscribeToCourse,
			{ courseId: subscription.courseId },
			(result: CourseSubscriptionResult) => {
				if (this.courseSubscription !== subscription) return;
				if (result.kind === 'subscribed') {
					subscription.listener.onSubscribed();
				} else if (result.reason === 'unavailable') {
					// The server couldn't check the request, so ask again while this course is still open.
					this.retryTimer = setTimeout(() => {
						if (this.courseSubscription === subscription && this.socket.connected) {
							this.requestCourseSubscription(subscription);
						}
					}, RETRY_DELAY_MILLISECONDS);
				}
			}
		);
	}

	private handleConnectError(error: Error): void {
		// While `active`, the client is already retrying a transport failure on its own.
		if (this.socket.active) {
			this.status = 'disconnected';
			return;
		}
		// The server denied the handshake. Retry only when the cause may be temporary; an invalid
		// or unadmitted session stays rejected.
		if (error.message === SERVER_UNAVAILABLE_ERROR || this.lastTokenRequestFailed) {
			this.status = 'disconnected';
			this.retryTimer = setTimeout(() => this.socket.connect(), RETRY_DELAY_MILLISECONDS);
			return;
		}
		this.status = 'rejected';
	}
}
