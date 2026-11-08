import { json } from '@sveltejs/kit';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { apiResponse, requireApiIdentity } from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		return json(await courseCatalogService.listCatalogCourses(locals.currentUser));
	});
