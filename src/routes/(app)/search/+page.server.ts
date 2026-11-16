import { searchQuerySchema } from '#lib/contracts/SearchContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { searchService } from '#lib/server/search/SearchService.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	// A malformed link falls back to an empty search rather than an error page.
	const parsed = searchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
	const query = parsed.success ? parsed.data : searchQuerySchema.parse({});
	const [search, { institutions }] = await Promise.all([
		searchService.search(query, user),
		courseCatalogService.listInstitutions(user)
	]);
	return { search, institutions };
};
