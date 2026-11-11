import { redirect } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import type { PageServerLoad } from './$types';

/** The optional last onboarding step; it needs the profile the earlier steps create. */
export const load: PageServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	if (!user.profile) redirect(303, '/onboarding');
	const [catalog, history] = await Promise.all([
		courseCatalogService.browseCourses({ institutionId: user.profile.primaryInstitutionId }, user),
		academicHistoryService.listOwnEntries(user)
	]);
	// The primary institution was deleted after onboarding; there is nothing to offer here.
	if (!catalog) redirect(303, '/explore');
	return { catalog, history, loadedAt: Date.now() };
};
