import { courseBrowseQuerySchema } from '#lib/contracts/CourseCatalogContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { courseFollowingFormActions } from '#lib/server/web/CourseFollowingFormActions.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const { institutions } = await courseCatalogService.listInstitutions(user);
	if (institutions.length === 0) return { institutions, catalog: null };

	const requestedInstitutionId = url.searchParams.get('institutionId');
	const institutionId =
		institutions.find((institution) => institution.id === requestedInstitutionId)?.id ??
		institutions[0].id;
	const query = courseBrowseQuerySchema.safeParse({
		institutionId,
		after: url.searchParams.get('after') ?? undefined
	});
	const catalog = await courseCatalogService.browseCourses(
		query.success ? query.data : { institutionId },
		user
	);
	return { institutions, catalog };
};

export const actions = courseFollowingFormActions;
