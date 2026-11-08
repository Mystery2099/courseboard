import { ObjectId } from 'mongodb';
import {
	completeOnboardingSchema,
	updateProfileSchema,
	type OnboardingResult,
	type OwnProfileResponse
} from '#lib/contracts/UserProfileContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import {
	institutionRepository,
	type InstitutionRepository
} from '#lib/server/catalog/InstitutionRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser, ApplicationUserProfile } from './ApplicationUser.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from './ApplicationUserRepository.ts';

/**
 * Onboarding sets a user's username, display name, and primary institution together; until then the
 * account can't use the rest of the application. Afterwards only the display name is editable.
 */
export class UserProfileService {
	/** Names that would look like staff or system accounts, including the "Deleted user" label. */
	private static readonly RESERVED_USERNAMES = new Set([
		'admin',
		'administrator',
		'moderator',
		'support',
		'system',
		'deleted',
		'deleted_user'
	]);

	constructor(
		private readonly users: ApplicationUserRepository,
		private readonly institutions: InstitutionRepository
	) {}

	async completeOnboarding(input: unknown, actor: ApplicationUser | null): Promise<OnboardingResult> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		if (user.profile) return { kind: 'already-onboarded' };
		const request = completeOnboardingSchema.parse(input);
		if (UserProfileService.RESERVED_USERNAMES.has(request.username)) {
			return { kind: 'username-unavailable' };
		}
		const institution = await this.institutions.findById(
			new ObjectId(request.primaryInstitutionId)
		);
		if (!institution) return { kind: 'institution-not-found' };

		// The unique username index is what keeps two people from claiming the same name at once.
		await DatabaseIndexInitializer.ensureIndexes();
		const outcome = await this.users.createProfile(
			new ObjectId(user.id),
			{
				username: request.username,
				displayName: request.displayName,
				primaryInstitutionId: institution._id
			},
			new Date()
		);
		if (outcome !== 'created') return { kind: outcome };
		return {
			kind: 'completed',
			profile: {
				username: request.username,
				displayName: request.displayName,
				primaryInstitution: { id: institution._id.toHexString(), name: institution.name }
			}
		};
	}

	/** Returns null until onboarding is complete. */
	async getOwnProfile(actor: ApplicationUser | null): Promise<OwnProfileResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		return user.profile ? this.toOwnProfile(user.profile) : null;
	}

	/** Returns null until onboarding is complete. */
	async updateProfile(
		input: unknown,
		actor: ApplicationUser | null
	): Promise<OwnProfileResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		if (!user.profile) return null;
		const { displayName } = updateProfileSchema.parse(input);
		const updated = await this.users.updateDisplayName(new ObjectId(user.id), displayName);
		return updated ? this.toOwnProfile({ ...user.profile, displayName }) : null;
	}

	private async toOwnProfile(profile: ApplicationUserProfile): Promise<OwnProfileResponse> {
		const institution = await this.institutions.findById(
			new ObjectId(profile.primaryInstitutionId)
		);
		return {
			username: profile.username,
			displayName: profile.displayName,
			primaryInstitution: {
				id: profile.primaryInstitutionId,
				name: institution?.name ?? 'Unknown institution'
			}
		};
	}
}

export const userProfileService = new UserProfileService(
	applicationUserRepository,
	institutionRepository
);
