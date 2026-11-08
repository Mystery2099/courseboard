import { error } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const course = await courseCatalogService.getCourse(params.courseId, user);
	if (!course) error(404, 'This course does not exist.');
	return { course };
};
