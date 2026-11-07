import type { Socket } from 'socket.io';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { verifyToken } from 'svelte-clerk/server';
import { CLERK_SECRET_KEY } from '$app/env/private';
import { applicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';

/**
 * Publishes the handshake authenticator that the Socket.IO server attached by the host process
 * (see `server/SocketServerAttacher.js`) delegates to. Until `register()` runs, that server
 * rejects every connection. Only admitted, active accounts may connect. Course/thread
 * subscriptions come later.
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
