import { error } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { courseNavigationService } from '#lib/server/catalog/CourseNavigationService.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const course = await courseCatalogService.getCourse(params.courseId, user);
	if (!course) error(404, 'This course does not exist.');
	await courseNavigationService.recordCourseVisit(course.id, user);
	return { course };
};
