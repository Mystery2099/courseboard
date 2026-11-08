import { z } from 'zod';
import { objectIdSchema } from './ApiContract.ts';

/** Usernames are stored lowercase, so `Alex_M` and `alex_m` are the same name. */
export const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^[a-z0-9_]{3,24}$/, 'Use 3 to 24 letters, numbers, or underscores.');

export const displayNameSchema = z
	.string()
	.trim()
	.min(1, 'Enter a display name.')
	.max(50, 'Use 50 characters or fewer.')
	.regex(/^[^\p{C}]*$/u, 'Remove control characters.')
	.transform((name) => name.replace(/\s+/g, ' '));

export const completeOnboardingSchema = z.object({
	primaryInstitutionId: objectIdSchema,
	username: usernameSchema,
	displayName: displayNameSchema
});

export type CompleteOnboardingRequest = z.infer<typeof completeOnboardingSchema>;

export const updateProfileSchema = z.object({ displayName: displayNameSchema });

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

export interface OwnProfileResponse {
	username: string;
	displayName: string;
	primaryInstitution: { id: string; name: string };
}

export type OnboardingResult =
	| { kind: 'completed'; profile: OwnProfileResponse }
	| { kind: 'already-onboarded' }
	| { kind: 'username-unavailable' }
	| { kind: 'institution-not-found' };
