import { error } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { courseNavigationService } from '#lib/server/catalog/CourseNavigationService.ts';
import { courseFollowingFormActions } from '#lib/server/web/CourseFollowingFormActions.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const course = await courseCatalogService.getCourse(params.courseId, user);
	if (!course) error(404, 'This course does not exist.');
	await courseNavigationService.recordCourseVisit(course.id, user);
	return { course };
};

export const actions = courseFollowingFormActions;
