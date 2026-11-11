import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { completeOnboardingSchema } from '#lib/contracts/UserProfileContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { demoCatalogLoader } from '#lib/server/catalog/DemoCatalogLoader.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	if (user.profile) redirect(303, '/');
	const { institutions } = await courseCatalogService.listInstitutions(user);
	return { institutions, isAdministrator: user.role === 'administrator' };
};

type OnboardingFieldErrors = Partial<
	Record<'primaryInstitutionId' | 'username' | 'displayName', string>
>;

function rejectOnboarding(
	status: number,
	submitted: Record<keyof OnboardingFieldErrors, string>,
	errors: OnboardingFieldErrors
) {
	return fail(status, { submitted, errors });
}

export const actions: Actions = {
	/** On a fresh database, an administrator can't reach the admin catalog page before onboarding. */
	loadDemoCatalog: async ({ locals }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		await demoCatalogLoader.loadDemoCatalog(administrator);
	},
	completeOnboarding: async ({ locals, request }) => {
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
			return rejectOnboarding(400, submitted, {
				primaryInstitutionId: fieldErrors.primaryInstitutionId && 'Choose your school.',
				username: fieldErrors.username?.[0],
				displayName: fieldErrors.displayName?.[0]
			});
		}

		const result = await userProfileService.completeOnboarding(parsed.data, user);
		if (result.kind === 'username-unavailable') {
			return rejectOnboarding(409, submitted, { username: 'That username is taken.' });
		}
		if (result.kind === 'institution-not-found') {
			return rejectOnboarding(404, submitted, {
				primaryInstitutionId: 'That school is no longer available. Choose another.'
			});
		}
		redirect(303, '/onboarding/courses');
	}
};
