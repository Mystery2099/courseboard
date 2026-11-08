import { sequence, type Handle, type ServerInit } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { SecurityHeaderPolicy } from '#lib/server/http/SecurityHeaderPolicy.ts';
import { admissionService } from '#lib/server/admission/AdmissionService.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { RealtimeGateway } from '#lib/server/realtime/RealtimeGateway.ts';

export const init: ServerInit = () => {
	mongoClientProvider.initialize();
	DatabaseIndexInitializer.ensureIndexesInBackground();
	RealtimeGateway.registerIfAttached();
};

/** Resolves the admitted application user for the Clerk session; routes enforce access. */
const resolveCurrentUser: Handle = async ({ event, resolve }) => {
	const { userId } = event.locals.auth();
	event.locals.currentUser = userId ? await admissionService.resolveCurrentUser(userId) : null;
	return resolve(event);
};

const applySecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	SecurityHeaderPolicy.apply(response.headers, event.url.protocol === 'https:');
	return response;
};

export const handle = sequence(applySecurityHeaders, withClerkHandler(), resolveCurrentUser);
