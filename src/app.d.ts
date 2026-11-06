/// <reference types="svelte-clerk/env" />
import type { Socket, Server as SocketIoServer } from 'socket.io';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** The admitted application user, or null when signed out or not admitted. */
			currentUser: ApplicationUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	/** Set by the dev Vite plugin or the production server before SvelteKit initializes. */
	var academicPlatformSocketServer: SocketIoServer | undefined;

	/** Set by RealtimeGateway once SvelteKit has initialized; sockets are rejected until then. */
	var academicPlatformSocketAuthenticator:
		((socket: Socket, next: (error?: Error) => void) => void) | undefined;
}

export {};
