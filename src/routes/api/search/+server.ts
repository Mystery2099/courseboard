import { json } from '@sveltejs/kit';
import { searchQuerySchema } from '#lib/contracts/SearchContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import { searchService } from '#lib/server/search/SearchService.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const query = searchQuerySchema.parse(Object.fromEntries(url.searchParams));
		return json(await searchService.search(query, actor));
	});
