import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import {
	updateProfileSchema,
	type OwnProfileResponse
} from '#lib/contracts/UserProfileContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { academicHistoryService } from '#lib/server/history/AcademicHistoryService.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * Without JavaScript the page load reruns within the action's request, where the current user was
 * read before the update, so it is brought up to date here.
 */
function applySavedProfile(user: ApplicationUser, saved: OwnProfileResponse): void {
	if (!user.profile) return;
	user.profile = {
		...user.profile,
		displayName: saved.displayName,
		isPrimaryInstitutionHidden: saved.isPrimaryInstitutionHidden
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	const profile = await userProfileService.getOwnProfile(user);
	if (!profile) error(409, 'Finish setting up your profile first.');
	const history = await academicHistoryService.listOwnEntries(user);
	return { profile, history, historyLoadedAt: Date.now() };
};

export const actions: Actions = {
	updateDisplayName: async ({ locals, request }) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const displayName = String((await request.formData()).get('displayName') ?? '');
		const parsed = updateProfileSchema.safeParse({ displayName });
		if (!parsed.success) {
			const message = z.flattenError(parsed.error).fieldErrors.displayName?.[0];
			return fail(400, { displayName, displayNameError: message ?? 'Check your display name.' });
		}
		const profile = await userProfileService.updateProfile(parsed.data, user);
		if (!profile) return fail(409, { displayName, displayNameError: 'Finish onboarding first.' });
		applySavedProfile(user, profile);
		return { displayNameSaved: true };
	},
	updatePrimaryInstitutionVisibility: async ({ locals, request }) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const submitted = z
			.enum(['true', 'false'])
			.safeParse((await request.formData()).get('isPrimaryInstitutionHidden'));
		if (!submitted.success) {
			return fail(400, { institutionVisibilityError: 'Choose Hide or Show.' });
		}
		const profile = await userProfileService.updateProfile(
			{ isPrimaryInstitutionHidden: submitted.data === 'true' },
			user
		);
		if (!profile) return fail(409, { institutionVisibilityError: 'Finish onboarding first.' });
		applySavedProfile(user, profile);
		return { institutionVisibilitySaved: true };
	}
};
