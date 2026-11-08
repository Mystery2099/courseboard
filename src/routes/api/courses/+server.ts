import { json } from '@sveltejs/kit';
import { courseBrowseQuerySchema } from '#lib/contracts/CourseCatalogContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { apiError, apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const query = courseBrowseQuerySchema.parse(Object.fromEntries(url.searchParams));
		const page = await courseCatalogService.browseCourses(query, actor);
		if (!page) return apiError(404, 'institution-not-found', 'This institution does not exist.');
		return json(page);
	});
