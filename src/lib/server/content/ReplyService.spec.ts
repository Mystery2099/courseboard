import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId, type ClientSession } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDetail } from './Post.ts';
import { PostRepository } from './PostRepository.ts';
import type { ReplyWithAuthor } from './Reply.ts';
import { ReplyRepository } from './ReplyRepository.ts';
import { ReplyService } from './ReplyService.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: {
		username: 'alex_m',
		displayName: 'Alex M',
		primaryInstitutionId: '000000000000000000000009',
		isPrimaryInstitutionHidden: false
	}
};
const postId = new ObjectId('000000000000000000000005');
const topLevelReplyId = new ObjectId('000000000000000000000006');
const submissionId = '4d6c1b0e-8a55-4a0c-9d2c-5c1c7f3b2a10';
const post: PostDetail = {
	_id: postId,
	courseId: new ObjectId('000000000000000000000003'),
	kind: 'discussion',
	authorId: new ObjectId('000000000000000000000002'),
	author: { username: 'sam', displayName: 'Sam' },
	title: 'Study group',
	bodyMarkdown: 'Anyone?',
	replyCount: 0,
	acceptedReplyId: null,
	lockedAt: null,
	createdAt: new Date('2026-11-01T10:00:00Z'),
	lastActivityAt: new Date('2026-11-01T10:00:00Z')
};

function createEventPublisher() {
	return {
		publishPostCreated: vi.fn(),
		publishReplyCreated: vi.fn(),
		publishReactionChanged: vi.fn()
	};
}

function createService(storedPost: PostDetail | null = post) {
	const replies = new ReplyRepository();
	const posts = new PostRepository();
	const session = {
		withTransaction: (operation: () => Promise<unknown>) => operation(),
		endSession: vi.fn().mockResolvedValue(undefined)
	} as unknown as ClientSession;
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(mongoClientProvider, 'startSession').mockReturnValue(session);
	vi.spyOn(posts, 'findById').mockResolvedValue(storedPost);
	vi.spyOn(replies, 'findBySubmission').mockResolvedValue(null);
	const recordReply = vi.spyOn(posts, 'recordReply').mockResolvedValue(true);
	const insert = vi.spyOn(replies, 'insert').mockResolvedValue();
	const events = createEventPublisher();
	return {
		service: new ReplyService(replies, posts, events),
		replies,
		recordReply,
		insert,
		session,
		events
	};
}

afterEach(() => vi.restoreAllMocks());

describe('reply service', () => {
	it('stores a reply as the acting user and counts it in the same transaction', async () => {
		const { service, recordReply, insert, session, events } = createService();

		const result = await service.createReply(
			postId.toHexString(),
			{ bodyMarkdown: ' Count me in. ', submissionId, authorId: '000000000000000000000002' },
			student
		);

		expect(result).toMatchObject({
			kind: 'created',
			reply: { bodyMarkdown: 'Count me in.', parentReplyId: null, author: { username: 'alex_m' } }
		});
		expect(recordReply).toHaveBeenCalledWith(postId, expect.any(Date), session);
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({ postId, authorId: new ObjectId(student.id), submissionId }),
			session
		);
		expect(events.publishReplyCreated).toHaveBeenCalledExactlyOnceWith(
			{
				courseId: post.courseId.toHexString(),
				postId: postId.toHexString(),
				replyId: result.kind === 'created' ? result.reply.id : null
			},
			student.id
		);
	});

	it('refuses replies to a locked thread, also when it is locked mid-request', async () => {
		const locked = createService({ ...post, lockedAt: new Date() });
		const request = { bodyMarkdown: 'Late.', submissionId };

		expect(await locked.service.createReply(postId.toHexString(), request, student)).toEqual({
			kind: 'post-locked'
		});
		expect(locked.recordReply).not.toHaveBeenCalled();
		expect(locked.events.publishReplyCreated).not.toHaveBeenCalled();

		const lockedMeanwhile = createService();
		lockedMeanwhile.recordReply.mockResolvedValue(false);
		expect(
			await lockedMeanwhile.service.createReply(postId.toHexString(), request, student)
		).toEqual({ kind: 'post-locked' });
		expect(lockedMeanwhile.insert).not.toHaveBeenCalled();
		expect(lockedMeanwhile.events.publishReplyCreated).not.toHaveBeenCalled();
	});

	it.each([
		{ placement: { postId, parentReplyId: null }, isAllowed: true },
		{ placement: { postId, parentReplyId: new ObjectId() }, isAllowed: false },
		{ placement: { postId: new ObjectId(), parentReplyId: null }, isAllowed: false },
		{ placement: null, isAllowed: false }
	])('nests one level under a reply of the same post: $isAllowed', async (scenario) => {
		const { service, replies, insert } = createService();
		vi.spyOn(replies, 'findPlacement').mockResolvedValue(scenario.placement);

		const result = await service.createReply(
			postId.toHexString(),
			{ bodyMarkdown: 'Agreed.', submissionId, parentReplyId: topLevelReplyId.toHexString() },
			student
		);

		expect(result.kind).toBe(scenario.isAllowed ? 'created' : 'parent-reply-unavailable');
		expect(insert).toHaveBeenCalledTimes(scenario.isAllowed ? 1 : 0);
	});

	it('returns the stored reply without announcing it again when a submission is retried', async () => {
		const { service, replies, recordReply, insert, events } = createService();
		const stored: ReplyWithAuthor = {
			_id: new ObjectId('000000000000000000000007'),
			postId,
			parentReplyId: null,
			bodyMarkdown: 'Count me in.',
			createdAt: new Date('2026-11-03T10:00:00Z'),
			author: { username: 'alex_m', displayName: 'Alex M' }
		};
		vi.spyOn(replies, 'findBySubmission').mockResolvedValue(stored);

		const result = await service.createReply(
			postId.toHexString(),
			{ bodyMarkdown: 'Count me in.', submissionId },
			student
		);

		expect(result).toMatchObject({ kind: 'created', reply: { id: stored._id.toHexString() } });
		expect(recordReply).not.toHaveBeenCalled();
		expect(insert).not.toHaveBeenCalled();
		expect(events.publishReplyCreated).not.toHaveBeenCalled();
	});

	it.each(['before the lock check', 'inside the transaction'])(
		'returns a reply stored by a concurrent retry instead of a lock refusal: %s',
		async (refusalPoint) => {
			const isLockedOnRead = refusalPoint === 'before the lock check';
			const { service, replies, recordReply, insert } = createService(
				isLockedOnRead ? { ...post, lockedAt: new Date() } : post
			);
			recordReply.mockResolvedValue(false);
			const stored: ReplyWithAuthor = {
				_id: new ObjectId('000000000000000000000008'),
				postId,
				parentReplyId: null,
				bodyMarkdown: 'Count me in.',
				createdAt: new Date('2026-11-03T10:00:00Z'),
				author: { username: 'alex_m', displayName: 'Alex M' }
			};
			// The first lookup misses; the other request stores the reply before the thread is locked.
			vi.spyOn(replies, 'findBySubmission').mockResolvedValueOnce(null).mockResolvedValue(stored);

			const result = await service.createReply(
				postId.toHexString(),
				{ bodyMarkdown: 'Count me in.', submissionId },
				student
			);

			expect(result).toMatchObject({ kind: 'created', reply: { id: stored._id.toHexString() } });
			expect(insert).not.toHaveBeenCalled();
		}
	);
});
