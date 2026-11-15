import { error } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { reviewService } from '#lib/server/content/ReviewService.ts';
import { CoursePostPageLoader } from '#lib/server/web/CoursePostPageLoader.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const actor = AccessGuard.requireAdmittedUser(locals);
	const [posts, reviewContext] = await Promise.all([
		CoursePostPageLoader.loadPostList(locals, params.courseId, 'review'),
		reviewService.getCourseContext(params.courseId, actor)
	]);
	if (!reviewContext) error(404, 'This course does not exist.', { code: 'course-not-found' });
	return { ...posts, reviewContext };
};
