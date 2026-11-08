import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { InstitutionRepository } from '#lib/server/catalog/InstitutionRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from './ApplicationUser.ts';
import { ApplicationUserRepository } from './ApplicationUserRepository.ts';
import { UserProfileService } from './UserProfileService.ts';

const institutionId = new ObjectId('000000000000000000000002');
const newStudent: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: null
};
const onboardingRequest = {
	primaryInstitutionId: institutionId.toHexString(),
	username: '  Alex_M ',
	displayName: 'Alex   Morgan'
};

function createService() {
	const users = new ApplicationUserRepository();
	const institutions = new InstitutionRepository();
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(institutions, 'findById').mockResolvedValue({
		_id: institutionId,
		name: 'Alfred State College'
	});
	return { service: new UserProfileService(users, institutions), users, institutions };
}

afterEach(() => vi.restoreAllMocks());

describe('user profile service', () => {
	it('creates a normalized profile for the acting user only', async () => {
		const { service, users } = createService();
		const createProfile = vi.spyOn(users, 'createProfile').mockResolvedValue('created');

		const result = await service.completeOnboarding(onboardingRequest, newStudent);

		expect(result).toEqual({
			kind: 'completed',
			profile: {
				username: 'alex_m',
				displayName: 'Alex Morgan',
				primaryInstitution: { id: institutionId.toHexString(), name: 'Alfred State College' }
			}
		});
		expect(createProfile).toHaveBeenCalledWith(
			new ObjectId(newStudent.id),
			{ username: 'alex_m', displayName: 'Alex Morgan', primaryInstitutionId: institutionId },
			expect.any(Date)
		);
	});

	it.each(['Admin', 'deleted_user'])('refuses reserved usernames: %s', async (username) => {
		const { service, users } = createService();
		const createProfile = vi.spyOn(users, 'createProfile');

		const result = await service.completeOnboarding({ ...onboardingRequest, username }, newStudent);

		expect(result).toEqual({ kind: 'username-unavailable' });
		expect(createProfile).not.toHaveBeenCalled();
	});

	it('reports a username another user already holds', async () => {
		const { service, users } = createService();
		vi.spyOn(users, 'createProfile').mockResolvedValue('username-unavailable');

		expect(await service.completeOnboarding(onboardingRequest, newStudent)).toEqual({
			kind: 'username-unavailable'
		});
	});

	it('refuses an institution that does not exist', async () => {
		const { service, users, institutions } = createService();
		vi.spyOn(institutions, 'findById').mockResolvedValue(null);
		const createProfile = vi.spyOn(users, 'createProfile');

		expect(await service.completeOnboarding(onboardingRequest, newStudent)).toEqual({
			kind: 'institution-not-found'
		});
		expect(createProfile).not.toHaveBeenCalled();
	});

	it('never replaces an existing profile', async () => {
		const { service, users } = createService();
		const createProfile = vi.spyOn(users, 'createProfile');
		const onboardedStudent = {
			...newStudent,
			profile: {
				username: 'alex_m',
				displayName: 'Alex',
				primaryInstitutionId: institutionId.toHexString()
			}
		};

		expect(await service.completeOnboarding(onboardingRequest, onboardedStudent)).toEqual({
			kind: 'already-onboarded'
		});
		expect(createProfile).not.toHaveBeenCalled();
	});

	it.each([
		{ ...onboardingRequest, username: 'a b' },
		{ ...onboardingRequest, displayName: '   ' },
		{ ...onboardingRequest, primaryInstitutionId: 'not-an-id' }
	])('rejects invalid input before writing: %j', async (input) => {
		const { service, users } = createService();
		const createProfile = vi.spyOn(users, 'createProfile');

		await expect(service.completeOnboarding(input, newStudent)).rejects.toThrow();
		expect(createProfile).not.toHaveBeenCalled();
	});

	it.each([null, { ...newStudent, status: 'suspended' as const }])(
		'rejects accounts without active admission: %j',
		async (actor) => {
			const { service, users } = createService();
			const createProfile = vi.spyOn(users, 'createProfile');

			await expect(service.completeOnboarding(onboardingRequest, actor)).rejects.toThrow();
			expect(createProfile).not.toHaveBeenCalled();
		}
	);
});
