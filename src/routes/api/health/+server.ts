import { json } from '@sveltejs/kit';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const databaseReachable = await mongoClientProvider.isReachable();
	return json(
		{ status: databaseReachable ? 'ok' : 'degraded', databaseReachable },
		{ status: databaseReachable ? 200 : 503 }
	);
};
