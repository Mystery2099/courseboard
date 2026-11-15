import { courseFollowingFormActions } from '#lib/server/web/CourseFollowingFormActions.ts';
import { CoursePostPageLoader } from '#lib/server/web/CoursePostPageLoader.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) =>
	CoursePostPageLoader.loadPostList(locals, params.courseId, null);

/** Every channel's Follow button posts here, so the actions live in one place. */
export const actions = courseFollowingFormActions;
