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

export const updateProfileSchema = z
	.object({
		displayName: displayNameSchema.optional(),
		isPrimaryInstitutionHidden: z.boolean().optional()
	})
	.refine(
		(changes) =>
			changes.displayName !== undefined || changes.isPrimaryInstitutionHidden !== undefined,
		'Change the display name or the school visibility.'
	);

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

export interface OwnProfileResponse {
	username: string;
	displayName: string;
	primaryInstitution: { id: string; name: string };
	/** Hidden from other users' views of the profile; the user still sees and uses it. */
	isPrimaryInstitutionHidden: boolean;
}

export type OnboardingResult =
	| { kind: 'completed'; profile: OwnProfileResponse }
	| { kind: 'already-onboarded' }
	| { kind: 'username-unavailable' }
	| { kind: 'institution-not-found' };

/** Another user's profile as admitted users see it. Email addresses are never included. */
export interface PublicProfileResponse {
	username: string;
	displayName: string;
	imageUrl: string | null;
	/** Null when the user hides it, including when they open their own public page. */
	primaryInstitution: { id: string; name: string } | null;
	isOwnProfile: boolean;
}
