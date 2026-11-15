import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import { CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDetail } from './Post.ts';
import { PostRepository } from './PostRepository.ts';
import { PostService } from './PostService.ts';
import { ReplyRepository } from './ReplyRepository.ts';

const profile = {
	username: 'alex_m',
	displayName: 'Alex M',
	primaryInstitutionId: '000000000000000000000009',
	isPrimaryInstitutionHidden: false
};
const asker: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'asker',
	role: 'member',
	status: 'active',
	profile
};
const otherStudent: ApplicationUser = { ...asker, id: '000000000000000000000002' };
const administrator: ApplicationUser = { ...otherStudent, role: 'administrator' };
const courseId = new ObjectId('000000000000000000000003');
const spaceId = new ObjectId('000000000000000000000004');
const postId = new ObjectId('000000000000000000000005');
const replyId = new ObjectId('000000000000000000000006');
const question: PostDetail = {
	_id: postId,
	courseId,
	kind: 'question',
	authorId: new ObjectId(asker.id),
	author: { username: 'alex_m', displayName: 'Alex M' },
	title: 'Which lab comes first?',
	bodyMarkdown: 'The syllabus lists two.',
	replyCount: 1,
	acceptedReplyId: null,
	lockedAt: null,
	createdAt: new Date('2026-11-01T10:00:00Z'),
	lastActivityAt: new Date('2026-11-02T10:00:00Z')
};

function createService(storedPost: PostDetail | null = question) {
	const posts = new PostRepository();
	const replies = new ReplyRepository();
	const courses = new CourseRepository();
	vi.spyOn(courses, 'findSpaceId').mockResolvedValue(spaceId);
	vi.spyOn(posts, 'findById').mockResolvedValue(storedPost);
	return { service: new PostService(posts, replies, courses), posts, replies };
}

afterEach(() => vi.restoreAllMocks());

describe('post service', () => {
	it('publishes a post as the acting user, ignoring a supplied author', async () => {
		const { service, posts } = createService();
		const insert = vi.spyOn(posts, 'insert').mockResolvedValue();

		const result = await service.createPost(
			courseId.toHexString(),
			{
				kind: 'question',
				title: '  Which lab comes first?  ',
				bodyMarkdown: 'The syllabus lists two.',
				authorId: otherStudent.id,
				lockedAt: '2026-01-01'
			},
			asker
		);

		expect(result.kind).toBe('created');
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceId,
				courseId,
				authorId: new ObjectId(asker.id),
				title: 'Which lab comes first?',
				replyCount: 0,
				acceptedReplyId: null,
				lockedAt: null
			})
		);
	});

	it('refuses to publish before onboarding', async () => {
		const { service, posts } = createService();
		const insert = vi.spyOn(posts, 'insert').mockResolvedValue();
		const create = service.createPost(
			courseId.toHexString(),
			{ kind: 'discussion', title: 'Study group', bodyMarkdown: 'Anyone?' },
			{ ...asker, profile: null }
		);

		await expect(create).rejects.toMatchObject({ code: 'onboarding-required' });
		expect(insert).not.toHaveBeenCalled();
	});

	it('lists unanswered questions by creation and pages with a cursor', async () => {
		const { service, posts } = createService();
		const findPage = vi.spyOn(posts, 'findPage').mockResolvedValue([]);

		await service.listPosts(
			courseId.toHexString(),
			{ kind: 'question', filter: 'unanswered', after: `1794000000000_${postId.toHexString()}` },
			asker
		);

		expect(findPage).toHaveBeenCalledWith(
			{
				spaceId,
				kinds: ['question'],
				orderedBy: 'createdAt',
				onlyWithoutReplies: true,
				after: { orderedAt: new Date(1794000000000), postId }
			},
			21
		);
		await expect(
			service.listPosts(courseId.toHexString(), { kind: 'discussion', filter: 'unanswered' }, asker)
		).rejects.toThrow();
	});

	it('lets only the asker choose the accepted reply, and only a reply of that question', async () => {
		const { service, posts, replies } = createService();
		const setAcceptedReply = vi.spyOn(posts, 'setAcceptedReply').mockResolvedValue(true);
		const findPlacement = vi.spyOn(replies, 'findPlacement');
		const choice = { replyId: replyId.toHexString() };

		await expect(
			service.chooseAcceptedReply(postId.toHexString(), choice, otherStudent)
		).rejects.toBeInstanceOf(AccessDeniedError);
		await expect(
			service.chooseAcceptedReply(postId.toHexString(), choice, administrator)
		).rejects.toBeInstanceOf(AccessDeniedError);

		findPlacement.mockResolvedValue({ postId: new ObjectId(), parentReplyId: null });
		expect(await service.chooseAcceptedReply(postId.toHexString(), choice, asker)).toEqual({
			kind: 'reply-not-found'
		});
		expect(setAcceptedReply).not.toHaveBeenCalled();

		findPlacement.mockResolvedValue({ postId, parentReplyId: null });
		const result = await service.chooseAcceptedReply(postId.toHexString(), choice, asker);
		expect(result).toMatchObject({
			kind: 'changed',
			post: { acceptedReplyId: replyId.toHexString(), hasAcceptedReply: true }
		});
		expect(setAcceptedReply).toHaveBeenCalledWith(postId, question.authorId, replyId);
	});

	it('has no accepted reply on discussions', async () => {
		const { service } = createService({ ...question, kind: 'discussion' });

		expect(await service.clearAcceptedReply(postId.toHexString(), asker)).toEqual({
			kind: 'not-a-question'
		});
	});

	it('lets only administrators lock a thread, without changing its activity', async () => {
		const { service, posts } = createService();
		const setLockedAt = vi.spyOn(posts, 'setLockedAt').mockResolvedValue(true);

		await expect(service.setLocked(postId.toHexString(), true, asker)).rejects.toBeInstanceOf(
			AccessDeniedError
		);
		expect(setLockedAt).not.toHaveBeenCalled();

		const locked = await service.setLocked(postId.toHexString(), true, administrator);
		expect(locked).toMatchObject({
			isLocked: true,
			lastActivityAt: question.lastActivityAt.toISOString()
		});
	});
});
