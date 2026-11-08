import { io, type Socket } from 'socket.io-client';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'rejected';

/** Sent by the server while it is still starting; every other handshake error is final. */
const SERVER_UNAVAILABLE_ERROR = 'unavailable';
const UNAVAILABLE_RETRY_DELAY_MILLISECONDS = 5_000;

/**
 * The browser's authenticated Socket.IO connection. The Clerk session token is requested on every
 * connection attempt, because tokens expire within about a minute and must not be reused after a
 * reconnect. Data still comes from HTTP; events only tell the client what to refetch.
 */
export class RealtimeConnection {
	status = $state<RealtimeConnectionStatus>('connecting');

	private readonly socket: Socket;
	private retryTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(sessionTokenProvider: () => Promise<string | null>) {
		this.socket = io({
			transports: ['websocket'],
			auth: (provideCredentials) => {
				sessionTokenProvider().then(
					(token) => provideCredentials({ token }),
					() => provideCredentials({ token: null })
				);
			}
		});
		this.socket.on('connect', () => (this.status = 'connected'));
		this.socket.on('disconnect', () => (this.status = 'disconnected'));
		this.socket.on('connect_error', (error) => this.handleConnectError(error));
	}

	close(): void {
		clearTimeout(this.retryTimer);
		this.socket.disconnect();
	}

	private handleConnectError(error: Error): void {
		// While `active`, the client is already retrying a transport failure on its own.
		if (this.socket.active) {
			this.status = 'disconnected';
			return;
		}
		if (error.message === SERVER_UNAVAILABLE_ERROR) {
			this.status = 'disconnected';
			this.retryTimer = setTimeout(
				() => this.socket.connect(),
				UNAVAILABLE_RETRY_DELAY_MILLISECONDS
			);
			return;
		}
		this.status = 'rejected';
	}
}
