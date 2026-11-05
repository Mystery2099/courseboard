import type { Server as SocketIoServer } from 'socket.io';
import { verifyToken } from 'svelte-clerk/server';
import { CLERK_SECRET_KEY } from '$app/env/private';

/**
 * Registers authentication and event handlers on the Socket.IO server that the host process
 * attached (see `server/SocketServerAttacher.js`). Course/thread subscriptions come later.
 */
export class RealtimeGateway {
	constructor(private readonly socketServer: SocketIoServer) {}

	register(): void {
		this.socketServer.use(async (socket, next) => {
			const sessionToken: unknown = socket.handshake.auth?.token;
			if (typeof sessionToken !== 'string' || !CLERK_SECRET_KEY) {
				next(new Error('unauthenticated'));
				return;
			}
			try {
				const claims = await verifyToken(sessionToken, { secretKey: CLERK_SECRET_KEY });
				socket.data.clerkUserId = claims.sub;
				next();
			} catch {
				next(new Error('unauthenticated'));
			}
		});
	}

	static registerIfAttached(): void {
		const socketServer = globalThis.academicPlatformSocketServer;
		if (!socketServer) {
			console.warn('No Socket.IO server attached; realtime is disabled for this process.');
			return;
		}
		new RealtimeGateway(socketServer).register();
	}
}
