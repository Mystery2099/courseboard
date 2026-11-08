import { fail, type RequestEvent } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';

type CourseRequestEvent = RequestEvent<{ courseId: string }>;

/** Web form adapters for following, mounted on the course page; the course comes from the route. */
export const courseFollowingFormActions = {
	follow: async ({ locals, params }: CourseRequestEvent) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const state = await courseFollowingService.followCourse(params.courseId, user);
		if (!state) return fail(404, { followingError: 'This course does not exist.' });
	},
	unfollow: async ({ locals, params }: CourseRequestEvent) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const state = await courseFollowingService.unfollowCourse(params.courseId, user);
		if (!state) return fail(404, { followingError: 'This course does not exist.' });
	}
};
