import type { ServerInit } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { RealtimeGateway } from '#lib/server/realtime/RealtimeGateway.ts';

export const init: ServerInit = async () => {
	await mongoClientProvider.connect();
	RealtimeGateway.registerIfAttached();
};

// Admission (invitation-based access) is enforced after Clerk authentication in Stage 0.
export const handle = withClerkHandler();
