import { createServer } from 'node:http';
import { SOCKET_SERVER_PATH, attachSocketServer } from './SocketServerAttacher.js';

// Attach Socket.IO before importing the SvelteKit handler, whose import runs the `init` hook.
const httpServer = createServer();
attachSocketServer(httpServer);

// A variable specifier keeps type checking out of the generated build output.
const svelteKitHandlerModulePath = '../build/handler.js';
const { handler } = await import(svelteKitHandlerModulePath);
httpServer.on('request', (request, response) => {
	// Socket.IO answers its own requests; SvelteKit must not respond to them too.
	if (request.url?.startsWith(SOCKET_SERVER_PATH)) return;
	handler(request, response);
});

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, process.env.HOST ?? '0.0.0.0', () => {
	console.log(`Listening on port ${port}`);
});
