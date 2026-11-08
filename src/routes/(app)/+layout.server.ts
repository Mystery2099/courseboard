import { redirect } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	if (!user.profile) redirect(303, '/onboarding');
	return {
		profile: { username: user.profile.username, displayName: user.profile.displayName },
		followedCourses: (await courseFollowingService.listFollowedCourses(user)).courses
	};
};
