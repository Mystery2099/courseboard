import {
	REALTIME_MESSAGES,
	type PostCreatedEvent,
	type ReactionChangedEvent,
	type ReplyCreatedEvent
} from '#lib/contracts/RealtimeContract.ts';
import { RealtimeRooms } from './RealtimeRooms.ts';

/**
 * Announces stored content to the course's listeners, except the author, whose page already shows
 * it. Call only after the write has committed.
 */
export interface ContentEventPublisher {
	publishPostCreated(event: PostCreatedEvent, authorId: string): void;
	publishReplyCreated(event: ReplyCreatedEvent, authorId: string): void;
	/** Sent to everyone in the course, the reacting person's other tabs included. */
	publishReactionChanged(event: ReactionChangedEvent): void;
}

/**
 * Emits on this process's Socket.IO server. Render runs one instance, so every socket that should
 * hear an event is attached here. The server is looked up when publishing, because services are
 * created before the host process may have attached it.
 */
export class SocketContentEventPublisher implements ContentEventPublisher {
	publishPostCreated(event: PostCreatedEvent, authorId: string): void {
		this.emit(REALTIME_MESSAGES.postCreated, event, authorId);
	}

	publishReplyCreated(event: ReplyCreatedEvent, authorId: string): void {
		this.emit(REALTIME_MESSAGES.replyCreated, event, authorId);
	}

	publishReactionChanged(event: ReactionChangedEvent): void {
		this.emit(REALTIME_MESSAGES.reactionChanged, event, null);
	}

	/** `excludedUserId` leaves out that account's sockets; null reaches the whole course. */
	private emit(
		message: string,
		event: PostCreatedEvent | ReplyCreatedEvent | ReactionChangedEvent,
		excludedUserId: string | null
	): void {
		const socketServer = globalThis.academicPlatformSocketServer;
		if (!socketServer) return;
		// The write already succeeded; a notice that can't be sent must not turn it into an error.
		try {
			const courseRoom = socketServer.to(RealtimeRooms.forCourse(event.courseId));
			(excludedUserId ? courseRoom.except(RealtimeRooms.forUser(excludedUserId)) : courseRoom).emit(
				message,
				event
			);
		} catch (error) {
			console.error(`Couldn't publish ${message} for course ${event.courseId}:`, error);
		}
	}
}

export const contentEventPublisher: ContentEventPublisher = new SocketContentEventPublisher();
