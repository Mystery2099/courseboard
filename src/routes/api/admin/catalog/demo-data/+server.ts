import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { demoCatalogLoader } from '#lib/server/catalog/DemoCatalogLoader.ts';
import { apiResponse, readApiJson, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdministrator(locals.currentUser);
		await readApiJson(request);
		return json(await demoCatalogLoader.loadDemoCatalog(actor));
	});
