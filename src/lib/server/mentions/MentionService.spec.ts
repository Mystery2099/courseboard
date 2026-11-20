import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { FixedWindowRateLimiter } from '#lib/server/limits/FixedWindowRateLimiter.ts';
import type { OnboardedUser } from '#lib/server/users/ApplicationUser.ts';
import { ApplicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import { MentionRepository } from './MentionRepository.ts';
import { MentionService } from './MentionService.ts';

const author: OnboardedUser = {
	id: '000000000000000000000001',
	clerkUserId: 'author',
	role: 'member',
	status: 'active',
	profile: {
		username: 'alex_m',
		displayName: 'Alex M',
		primaryInstitutionId: '000000000000000000000009',
		isPrimaryInstitutionHidden: false
	}
};
const sam = { _id: new ObjectId('000000000000000000000002'), username: 'sam' };
const kim = { _id: new ObjectId('000000000000000000000003'), username: 'kim' };
const mentionEvent = {
	courseId: '000000000000000000000004',
	postId: '000000000000000000000005',
	postKind: 'discussion' as const,
	replyId: null
};
const HOUR = 60 * 60 * 1000;

function createService(mentionable = [sam, kim]) {
	let now = 0;
	const clock = () => now;
	const users = new ApplicationUserRepository();
	const findMentionable = vi
		.spyOn(users, 'findMentionableByUsernames')
		.mockImplementation(async (usernames) =>
			mentionable.filter((account) => usernames.includes(account.username))
		);
	const events = {
		publishPostCreated: vi.fn(),
		publishReplyCreated: vi.fn(),
		publishReactionChanged: vi.fn(),
		publishMentionCreated: vi.fn()
	};
	const service = new MentionService(users, new MentionRepository(), events, {
		byAuthor: new FixedWindowRateLimiter(30, HOUR, clock),
		byAuthorAndRecipient: new FixedWindowRateLimiter(5, HOUR, clock),
		noticesByAuthorAndRecipient: new FixedWindowRateLimiter(1, 10 * 60 * 1000, clock)
	});
	return { service, events, findMentionable, advanceBy: (ms: number) => (now += ms) };
}

afterEach(() => vi.restoreAllMocks());

describe('mention service', () => {
	it('keeps only active, onboarded people other than the author, in the order written', async () => {
		const { service, findMentionable } = createService();

		const mentioned = await service.resolveMentions(
			'@kim and @ghost, cc @Alex_M and @SAM `@sam`',
			author
		);

		expect(findMentionable).toHaveBeenCalledWith(['kim', 'ghost', 'sam']);
		expect(mentioned).toEqual([
			{ userId: kim._id, username: 'kim' },
			{ userId: sam._id, username: 'sam' }
		]);
	});

	it('stores no mentions instead of failing when the lookup fails', async () => {
		const { service, findMentionable } = createService();
		findMentionable.mockRejectedValue(new Error('database unavailable'));
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		expect(await service.resolveMentions('@sam', author)).toEqual([]);
	});

	it('keeps at most ten people per post or reply, after skipping unknown names', async () => {
		const people = Array.from({ length: 12 }, (_, index) => ({
			_id: new ObjectId(),
			username: `person${index}`
		}));
		const { service } = createService(people);
		const unknown = Array.from({ length: 10 }, (_, index) => `@ghost${index}`).join(' ');
		const known = people.map((person) => `@${person.username}`).join(' ');

		const mentioned = await service.resolveMentions(`${unknown} ${known}`, author);

		expect(mentioned.map((person) => person.username)).toEqual(
			people.slice(0, 10).map((person) => person.username)
		);
	});

	it('stops storing mentions of one person after five an hour, then allows them again', async () => {
		const { service, advanceBy } = createService();
		for (let count = 0; count < 5; count += 1) {
			expect(await service.resolveMentions('@sam', author)).toHaveLength(1);
		}

		expect(await service.resolveMentions('@sam @kim', author)).toEqual([
			{ userId: kim._id, username: 'kim' }
		]);
		advanceBy(HOUR);
		expect(await service.resolveMentions('@sam', author)).toHaveLength(1);
	});

	it('stops storing an author’s mentions after thirty an hour', async () => {
		const people = Array.from({ length: 31 }, (_, index) => ({
			_id: new ObjectId(),
			username: `person${index}`
		}));
		const { service } = createService(people);
		let stored = 0;
		for (let start = 0; start < 31; start += 10) {
			const body = people
				.slice(start, start + 10)
				.map((person) => `@${person.username}`)
				.join(' ');
			stored += (await service.resolveMentions(body, author)).length;
		}

		expect(stored).toBe(30);
	});

	it('sends one live notice per author and person every ten minutes', async () => {
		const { service, events, advanceBy } = createService();
		const mentioned = [{ userId: sam._id, username: 'sam' }];

		service.announceMentions(mentioned, mentionEvent, author.id);
		service.announceMentions(mentioned, mentionEvent, author.id);
		advanceBy(10 * 60 * 1000);
		service.announceMentions(mentioned, mentionEvent, author.id);

		expect(events.publishMentionCreated).toHaveBeenCalledTimes(2);
		expect(events.publishMentionCreated).toHaveBeenCalledWith(mentionEvent, sam._id.toHexString());
	});
});
