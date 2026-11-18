import type { Socket } from 'socket.io';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { verifyToken } from 'svelte-clerk/server';
import { CLERK_SECRET_KEY } from '$app/env/private';
import { applicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import {
	REALTIME_MESSAGES,
	type CourseSubscriptionResult
} from '#lib/contracts/RealtimeContract.ts';
import { RealtimeRooms } from './RealtimeRooms.ts';
import { courseSubscriptionService } from './CourseSubscriptionService.ts';

/**
 * Publishes the handshake authenticator that the Socket.IO server attached by the host process
 * (see `server/SocketServerAttacher.js`) delegates to. Until `register()` runs, that server
 * rejects every connection. Only admitted, active accounts may connect, and each connected socket
 * listens to at most one course room at a time.
 */
export class RealtimeGateway {
	register(): void {
		if (!CLERK_SECRET_KEY) {
			console.error('CLERK_SECRET_KEY is not set; every realtime connection will be rejected.');
		}
		globalThis.academicPlatformSocketAuthenticator = (socket, next) => {
			void this.authenticate(socket).then(
				() => next(),
				(error: unknown) => {
					// Clients only learn that authentication failed; the reason stays in server logs.
					const reason = error instanceof Error ? error.message : String(error);
					console.warn(`Rejected socket handshake ${socket.id}: ${reason}`);
					next(new Error('unauthenticated'));
				}
			);
		};
		globalThis.academicPlatformSocketConnectionHandler = (socket) => this.handleConnection(socket);
	}

	private handleConnection(socket: Socket): void {
		socket.data.subscriptionRequestNumber = 0;
		void socket.join(RealtimeRooms.forUser(socket.data.userId));
		socket.on(REALTIME_MESSAGES.subscribeToCourse, (request: unknown, acknowledge: unknown) => {
			void this.subscribeToCourse(socket, request).then((result) => {
				if (typeof acknowledge === 'function') acknowledge(result);
			});
		});
		socket.on(REALTIME_MESSAGES.unsubscribeFromCourse, () => {
			socket.data.subscriptionRequestNumber += 1;
			RealtimeGateway.leaveCourseRooms(socket);
		});
	}

	private async subscribeToCourse(
		socket: Socket,
		request: unknown
	): Promise<CourseSubscriptionResult> {
		const requestNumber = ++socket.data.subscriptionRequestNumber;
		const decision = await courseSubscriptionService
			.authorize(socket.data.clerkUserId, request)
			.catch((error: unknown) => {
				console.error(`Couldn't check course subscription for socket ${socket.id}:`, error);
				return { kind: 'refused', reason: 'unavailable' } as const;
			});
		// A later subscription or an unsubscribe arrived while this one was being checked.
		if (socket.data.subscriptionRequestNumber !== requestNumber) {
			return { kind: 'refused', reason: 'superseded' };
		}
		if (decision.kind === 'refused') return decision;
		RealtimeGateway.leaveCourseRooms(socket);
		await socket.join(RealtimeRooms.forCourse(decision.courseId));
		return { kind: 'subscribed' };
	}

	private static leaveCourseRooms(socket: Socket): void {
		for (const room of socket.rooms) {
			if (RealtimeRooms.isCourseRoom(room)) void socket.leave(room);
		}
	}

	private async authenticate(socket: Socket): Promise<void> {
		if (!CLERK_SECRET_KEY) {
			throw new Error('CLERK_SECRET_KEY is not set.');
		}
		const sessionToken: unknown = socket.handshake.auth?.token;
		if (typeof sessionToken !== 'string' || sessionToken.length === 0) {
			throw new Error('No session token in handshake.');
		}
		const claims = await verifyToken(sessionToken, { secretKey: CLERK_SECRET_KEY });
		const user = AccessPolicy.requireAdmittedUser(
			await applicationUserRepository.findByClerkUserId(claims.sub)
		);
		socket.data.clerkUserId = claims.sub;
		socket.data.userId = user.id;
	}

	static registerIfAttached(): void {
		if (!globalThis.academicPlatformSocketServer) {
			console.warn('No Socket.IO server attached; realtime is disabled for this process.');
			return;
		}
		new RealtimeGateway().register();
	}
}
