import { z } from 'zod';
import { objectIdSchema } from './ApiContract.ts';
import type { ValidationErrorCode } from './ErrorContract.ts';

/** A character a username can hold, as a regular expression class; capitals are lowercased. */
export const USERNAME_CHARACTER_SOURCE = '[A-Za-z0-9_]';
export const USERNAME_MAX_LENGTH = 24;
/** A whole username, as a regular expression source for building mention patterns. */
export const USERNAME_SOURCE = `${USERNAME_CHARACTER_SOURCE}{3,${USERNAME_MAX_LENGTH}}`;

/** Usernames are stored lowercase, so `Alex_M` and `alex_m` are the same name. */
export const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.regex(new RegExp(`^${USERNAME_SOURCE}$`), 'username-format' satisfies ValidationErrorCode);

export const displayNameSchema = z
	.string()
	.trim()
	.min(1, 'display-name-required' satisfies ValidationErrorCode)
	.max(50, 'text-too-long' satisfies ValidationErrorCode)
	.regex(/^[^\p{C}]*$/u, 'control-characters' satisfies ValidationErrorCode)
	.transform((name) => name.replace(/\s+/g, ' '));

export const completeOnboardingSchema = z.object({
	primaryInstitutionId: objectIdSchema,
	username: usernameSchema,
	displayName: displayNameSchema
});

export const updateProfileSchema = z
	.object({
		displayName: displayNameSchema.optional(),
		isPrimaryInstitutionHidden: z.boolean().optional()
	})
	.refine(
		(changes) =>
			changes.displayName !== undefined || changes.isPrimaryInstitutionHidden !== undefined,
		'profile-change-required' satisfies ValidationErrorCode
	);

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
