import { Server } from 'socket.io';

export const SOCKET_SERVER_PATH = '/socket.io/';

/**
 * Attaches a Socket.IO server (WebSocket transport only) to a Node HTTP server and publishes it
 * on globalThis so SvelteKit's `init` hook can register handlers. Used by both the Vite dev
 * server and the production entry point.
 *
 * @param {import('node:http').Server} httpServer
 */
export function attachSocketServer(httpServer) {
	if (globalThis.academicPlatformSocketServer) return globalThis.academicPlatformSocketServer;
	const socketServer = new Server(httpServer, { transports: ['websocket'] });
	globalThis.academicPlatformSocketServer = socketServer;
	return socketServer;
}
