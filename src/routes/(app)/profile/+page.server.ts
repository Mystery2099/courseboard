import { error } from '@sveltejs/kit';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const profile = await userProfileService.getOwnProfile(user);
	if (!profile) {
		error(409, 'Finish setting up your profile first.', { code: 'onboarding-required' });
	}
	const history = await academicHistoryService.listOwnEntries(user);
	return { profile, history, historyLoadedAt: Date.now() };
};
