import { fail, type RequestEvent } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';

async function readCourseId(request: Request): Promise<string> {
	const courseId = (await request.formData()).get('courseId');
	return typeof courseId === 'string' ? courseId : '';
}

/** Web form adapters for following; pages submit a `courseId` field to `?/follow` or `?/unfollow`. */
export const courseFollowingFormActions = {
	follow: async ({ locals, request }: RequestEvent) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const state = await courseFollowingService.followCourse(await readCourseId(request), user);
		if (!state) return fail(404, { followingError: 'This course does not exist.' });
	},
	unfollow: async ({ locals, request }: RequestEvent) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const state = await courseFollowingService.unfollowCourse(await readCourseId(request), user);
		if (!state) return fail(404, { followingError: 'This course does not exist.' });
	}
};
