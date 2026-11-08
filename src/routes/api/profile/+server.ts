import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import { userProfileService } from '#lib/server/users/UserProfileService.ts';
import type { RequestHandler } from './$types';

function onboardingRequired(): Response {
	return apiError(409, 'onboarding-required', 'Finish setting up your profile first.');
}

export const GET: RequestHandler = ({ locals }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const profile = await userProfileService.getOwnProfile(locals.currentUser);
		return profile ? json(profile) : onboardingRequired();
	});

/** Completes onboarding. The profile can only be created once. */
export const POST: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const result = await userProfileService.completeOnboarding(await readApiJson(request), actor);
		switch (result.kind) {
			case 'completed':
				return json(result.profile, { status: 201 });
			case 'already-onboarded':
				return apiError(409, 'already-onboarded', 'Your profile is already set up.');
			case 'username-unavailable':
				return apiError(409, 'username-unavailable', 'That username is taken.');
			case 'institution-not-found':
				return apiError(404, 'institution-not-found', 'This institution does not exist.');
		}
	});

export const PATCH: RequestHandler = ({ locals, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const profile = await userProfileService.updateProfile(await readApiJson(request), actor);
		return profile ? json(profile) : onboardingRequired();
	});
