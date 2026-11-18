import {
	REALTIME_MESSAGES,
	type PostCreatedEvent,
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

	private emit(
		message: string,
		event: PostCreatedEvent | ReplyCreatedEvent,
		authorId: string
	): void {
		const socketServer = globalThis.academicPlatformSocketServer;
		if (!socketServer) return;
		// The write already succeeded; a notice that can't be sent must not turn it into an error.
		try {
			socketServer
				.to(RealtimeRooms.forCourse(event.courseId))
				.except(RealtimeRooms.forUser(authorId))
				.emit(message, event);
		} catch (error) {
			console.error(`Couldn't publish ${message} for course ${event.courseId}:`, error);
		}
	}
}

export const contentEventPublisher: ContentEventPublisher = new SocketContentEventPublisher();
