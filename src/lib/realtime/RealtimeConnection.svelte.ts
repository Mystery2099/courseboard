import { io, type Socket } from 'socket.io-client';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'rejected';

/** Sent by the server while it is still starting. */
const SERVER_UNAVAILABLE_ERROR = 'unavailable';
const RETRY_DELAY_MILLISECONDS = 5_000;

/**
 * The browser's authenticated Socket.IO connection. The Clerk session token is requested on every
 * connection attempt, because tokens expire within about a minute and must not be reused after a
 * reconnect. Data still comes from HTTP; events only tell the client what to refetch.
 */
export class RealtimeConnection {
	status = $state<RealtimeConnectionStatus>('connecting');

	private readonly socket: Socket;
	private retryTimer: ReturnType<typeof setTimeout> | undefined;
	private lastTokenRequestFailed = false;

	constructor(sessionTokenProvider: () => Promise<string | null>) {
		this.socket = io({
			transports: ['websocket'],
			auth: (provideCredentials) => {
				sessionTokenProvider().then(
					(token) => {
						this.lastTokenRequestFailed = false;
						provideCredentials({ token });
					},
					() => {
						this.lastTokenRequestFailed = true;
						provideCredentials({ token: null });
					}
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
		// The server denied the handshake. Retry only when the cause may be temporary; an invalid
		// or unadmitted session stays rejected.
		if (error.message === SERVER_UNAVAILABLE_ERROR || this.lastTokenRequestFailed) {
			this.status = 'disconnected';
			this.retryTimer = setTimeout(() => this.socket.connect(), RETRY_DELAY_MILLISECONDS);
			return;
		}
		this.status = 'rejected';
	}
}
