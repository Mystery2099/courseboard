import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { demoCatalogLoader } from '#lib/server/catalog/DemoCatalogLoader.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const administrator = AccessGuard.requireAdministrator(locals);
	return courseCatalogService.listCatalogCourses(administrator);
};

export const actions: Actions = {
	loadDemoCatalog: async ({ locals }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		return { demoCatalogLoad: await demoCatalogLoader.loadDemoCatalog(administrator) };
	}
};
