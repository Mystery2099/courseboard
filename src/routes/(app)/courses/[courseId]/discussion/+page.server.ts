import { CoursePostPageLoader } from '#lib/server/web/CoursePostPageLoader.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) =>
	CoursePostPageLoader.loadPostList(locals, params.courseId, 'discussion');
