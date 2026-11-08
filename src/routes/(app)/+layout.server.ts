import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	return { followedCourses: (await courseFollowingService.listFollowedCourses(user)).courses };
};
