import type { Socket } from 'socket.io';
import { verifyToken } from 'svelte-clerk/server';
import { CLERK_SECRET_KEY } from '$app/env/private';

/**
 * Publishes the handshake authenticator that the Socket.IO server attached by the host process
 * (see `server/SocketServerAttacher.js`) delegates to. Until `register()` runs, that server
 * rejects every connection. Course/thread subscriptions come later.
 */
export class RealtimeGateway {
	register(): void {
		globalThis.academicPlatformSocketAuthenticator = (socket, next) => {
			void this.authenticate(socket).then(
				() => next(),
				() => next(new Error('unauthenticated'))
			);
		};
	}

	private async authenticate(socket: Socket): Promise<void> {
		const sessionToken: unknown = socket.handshake.auth?.token;
		if (typeof sessionToken !== 'string' || !CLERK_SECRET_KEY) {
			throw new Error('Missing session token or Clerk secret key.');
		}
		const claims = await verifyToken(sessionToken, { secretKey: CLERK_SECRET_KEY });
		socket.data.clerkUserId = claims.sub;
	}

	static registerIfAttached(): void {
		if (!globalThis.academicPlatformSocketServer) {
			console.warn('No Socket.IO server attached; realtime is disabled for this process.');
			return;
		}
		new RealtimeGateway().register();
	}
}
