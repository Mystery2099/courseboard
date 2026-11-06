import { Server } from 'socket.io';

export const SOCKET_SERVER_PATH = '/socket.io/';

/**
 * Attaches a Socket.IO server (WebSocket transport only) to a Node HTTP server and publishes it
 * on globalThis so SvelteKit's `init` hook can register handlers. Used by both the Vite dev
 * server and the production entry point.
 *
 * Connections fail closed: every handshake is delegated to the authenticator that
 * `RealtimeGateway` publishes, and is rejected while none has been registered yet (before
 * SvelteKit's `init` hook runs, or while it is still connecting to MongoDB).
 *
 * @param {import('node:http').Server} httpServer
 */
export function attachSocketServer(httpServer) {
	if (globalThis.academicPlatformSocketServer) return globalThis.academicPlatformSocketServer;
	const socketServer = new Server(httpServer, { transports: ['websocket'] });
	socketServer.use((socket, next) => {
		const authenticator = globalThis.academicPlatformSocketAuthenticator;
		if (!authenticator) {
			next(new Error('unavailable'));
			return;
		}
		authenticator(socket, next);
	});
	globalThis.academicPlatformSocketServer = socketServer;
	return socketServer;
}
