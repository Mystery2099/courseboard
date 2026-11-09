import { error } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const [person, history] = await Promise.all([
		userProfileService.getPublicProfile(params.username, user),
		academicHistoryService.listVisibleEntries(params.username, user)
	]);
	if (!person || !history) error(404, 'This user does not exist.');
	return { person, history, historyLoadedAt: Date.now() };
};
