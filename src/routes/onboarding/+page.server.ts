import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { completeOnboardingSchema } from '#lib/contracts/UserProfileContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	if (user.profile) redirect(303, '/');
	return courseCatalogService.listInstitutions(user);
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = AccessGuard.requireAdmittedUser(locals);
		const formData = await request.formData();
		const submitted = {
			primaryInstitutionId: String(formData.get('primaryInstitutionId') ?? ''),
			username: String(formData.get('username') ?? ''),
			displayName: String(formData.get('displayName') ?? '')
		};
		const parsed = completeOnboardingSchema.safeParse(submitted);
		if (!parsed.success) {
			const fieldErrors = z.flattenError(parsed.error).fieldErrors;
			return fail(400, {
				submitted,
				errors: {
					primaryInstitutionId: fieldErrors.primaryInstitutionId && 'Choose your school.',
					username: fieldErrors.username?.[0],
					displayName: fieldErrors.displayName?.[0]
				}
			});
		}

		const result = await userProfileService.completeOnboarding(parsed.data, user);
		if (result.kind === 'username-unavailable') {
			return fail(409, { submitted, errors: { username: 'That username is taken.' } });
		}
		if (result.kind === 'institution-not-found') {
			return fail(404, {
				submitted,
				errors: { primaryInstitutionId: 'That school is no longer available. Choose another.' }
			});
		}
		redirect(303, '/explore');
	}
};
