import { ObjectId } from 'mongodb';
import {
	completeOnboardingSchema,
	updateProfileSchema,
	usernameSchema,
	type OnboardingResult,
	type OwnProfileResponse,
	type PublicProfileResponse
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
import { profilePhotoLookup, type ProfilePhotoLookup } from './ProfilePhotoLookup.ts';

/**
 * Onboarding sets a user's username, display name, and primary institution together; until then the
 * account can't use the rest of the application. Afterwards the display name and whether other
 * users see the primary institution are editable.
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
		private readonly institutions: InstitutionRepository,
		private readonly profilePhotos: ProfilePhotoLookup
	) {}

	async completeOnboarding(
		input: unknown,
		actor: ApplicationUser | null
	): Promise<OnboardingResult> {
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
				primaryInstitution: { id: institution._id.toHexString(), name: institution.name },
				isPrimaryInstitutionHidden: false
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
		const { displayName, isPrimaryInstitutionHidden } = updateProfileSchema.parse(input);
		const updated = await this.users.updateProfile(new ObjectId(user.id), {
			...(displayName !== undefined && { displayName }),
			...(isPrimaryInstitutionHidden !== undefined && {
				primaryInstitutionHidden: isPrimaryInstitutionHidden
			})
		});
		if (!updated) return null;
		return this.toOwnProfile({
			...user.profile,
			displayName: displayName ?? user.profile.displayName,
			isPrimaryInstitutionHidden:
				isPrimaryInstitutionHidden ?? user.profile.isPrimaryInstitutionHidden
		});
	}

	/** Another onboarded user's profile; null when no onboarded user has that username. */
	async getPublicProfile(
		username: string,
		actor: ApplicationUser | null
	): Promise<PublicProfileResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const parsedUsername = usernameSchema.safeParse(username);
		if (!parsedUsername.success) return null;
		const profile = await this.users.findPublicProfileByUsername(parsedUsername.data);
		if (!profile) return null;
		const { primaryInstitutionId } = profile;
		const [institution, imageUrl] = await Promise.all([
			primaryInstitutionId ? this.institutions.findById(primaryInstitutionId) : null,
			this.profilePhotos.findImageUrl(profile.clerkUserId)
		]);
		return {
			username: profile.username,
			displayName: profile.displayName,
			imageUrl,
			primaryInstitution: primaryInstitutionId && {
				id: primaryInstitutionId.toHexString(),
				name: institution?.name ?? 'Unknown institution'
			},
			isOwnProfile: profile._id.toHexString() === user.id
		};
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
			},
			isPrimaryInstitutionHidden: profile.isPrimaryInstitutionHidden
		};
	}
}

export const userProfileService = new UserProfileService(
	applicationUserRepository,
	institutionRepository,
	profilePhotoLookup
);
