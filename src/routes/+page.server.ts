import { redirect } from '@sveltejs/kit';
import { courseNavigationService } from '#lib/server/catalog/CourseNavigationService.ts';
import type { PageServerLoad } from './$types';

/** Admitted users resume their last course, or start with discovery. */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.currentUser?.status === 'active') {
		const courseId = await courseNavigationService.findResumableCourseId(locals.currentUser);
		redirect(303, courseId ? `/courses/${courseId}` : '/explore');
	}
	return { isSignedIn: locals.auth().userId !== null };
};
