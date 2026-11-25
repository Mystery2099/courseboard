import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import { CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import { CourseModerationAccess } from '#lib/server/moderation/CourseModerationAccess.ts';
import { ModeratorAssignmentRepository } from '#lib/server/moderation/ModeratorAssignmentRepository.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { MentionRepository } from '#lib/server/mentions/MentionRepository.ts';
import { MentionService } from '#lib/server/mentions/MentionService.ts';
import { ApplicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import type { PostDetail } from './Post.ts';
import { PostRepository } from './PostRepository.ts';
import { PostService } from './PostService.ts';
import { ReplyRepository } from './ReplyRepository.ts';
import { ReviewRepository } from './ReviewRepository.ts';

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
const moderator: ApplicationUser = { ...asker, id: '000000000000000000000007' };
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

function createEventPublisher() {
	return {
		publishPostCreated: vi.fn(),
		publishReplyCreated: vi.fn(),
		publishPostLockChanged: vi.fn(),
		publishReactionChanged: vi.fn(),
		publishMentionCreated: vi.fn()
	};
}

function createMentionService(events: ReturnType<typeof createEventPublisher>) {
	const users = new ApplicationUserRepository();
	vi.spyOn(users, 'findMentionableByUsernames').mockResolvedValue([]);
	return new MentionService(
		users,
		new MentionRepository(),
		events,
		MentionService.createDefaultRateLimiters()
	);
}

function createService(storedPost: PostDetail | null = question) {
	const posts = new PostRepository();
	const replies = new ReplyRepository();
	const reviews = new ReviewRepository();
	const courses = new CourseRepository();
	vi.spyOn(courses, 'findSpaceId').mockResolvedValue(spaceId);
	vi.spyOn(posts, 'findById').mockResolvedValue(storedPost);
	const assignments = new ModeratorAssignmentRepository();
	const isAssigned = vi.spyOn(assignments, 'isAssigned').mockResolvedValue(false);
	const events = createEventPublisher();
	const moderation = new CourseModerationAccess(assignments);
	return {
		service: new PostService(
			posts,
			replies,
			reviews,
			courses,
			events,
			moderation,
			createMentionService(events)
		),
		posts,
		replies,
		reviews,
		events,
		isAssigned
	};
}

afterEach(() => vi.restoreAllMocks());

describe('post service', () => {
	it('publishes a post as the acting user, ignoring a supplied author', async () => {
		const { service, posts, events } = createService();
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
		const storedPostId = (insert.mock.calls[0][0] as { _id: ObjectId })._id.toHexString();
		expect(events.publishPostCreated).toHaveBeenCalledExactlyOnceWith(
			{
				courseId: courseId.toHexString(),
				postId: storedPostId,
				kind: 'question'
			},
			asker.id
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

	it('does not let the general post endpoint bypass review eligibility', async () => {
		const { service, posts } = createService();
		const insert = vi.spyOn(posts, 'insert').mockResolvedValue();

		await expect(
			service.createPost(
				courseId.toHexString(),
				{ kind: 'review', title: 'Not eligible', bodyMarkdown: 'No history entry.' },
				asker
			)
		).rejects.toThrow();
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

	it('lets administrators lock a thread, without changing its activity', async () => {
		const { service, posts, events } = createService();
		const setLockedAt = vi.spyOn(posts, 'setLockedAt').mockResolvedValue(true);

		await expect(service.setLocked(postId.toHexString(), true, asker)).rejects.toBeInstanceOf(
			AccessDeniedError
		);
		expect(setLockedAt).not.toHaveBeenCalled();
		expect(events.publishPostLockChanged).not.toHaveBeenCalled();

		const locked = await service.setLocked(postId.toHexString(), true, administrator);
		expect(locked).toMatchObject({
			isLocked: true,
			lastActivityAt: question.lastActivityAt.toISOString()
		});
		expect(events.publishPostLockChanged).toHaveBeenCalledExactlyOnceWith({
			courseId: courseId.toHexString(),
			postId: postId.toHexString()
		});
	});

	it('announces a lock change only when the write found the post and changed it', async () => {
		const { service, posts, events } = createService({ ...question, lockedAt: new Date() });
		const setLockedAt = vi.spyOn(posts, 'setLockedAt').mockResolvedValue(false);

		expect(await service.setLocked(postId.toHexString(), false, administrator)).toBeNull();
		expect(events.publishPostLockChanged).not.toHaveBeenCalled();

		setLockedAt.mockResolvedValue(true);
		await service.setLocked(postId.toHexString(), true, administrator);
		expect(events.publishPostLockChanged).not.toHaveBeenCalled();
	});

	it("lets a course's moderators lock only that course's threads", async () => {
		const { service, posts, isAssigned } = createService();
		const setLockedAt = vi.spyOn(posts, 'setLockedAt').mockResolvedValue(true);
		isAssigned.mockImplementation(
			async (userId, assignedCourseId) =>
				userId.equals(moderator.id) && assignedCourseId.equals(courseId)
		);

		const locked = await service.setLocked(postId.toHexString(), true, moderator);
		expect(locked).toMatchObject({ isLocked: true, viewerPermissions: { canLock: true } });
		expect(isAssigned).toHaveBeenCalledWith(new ObjectId(moderator.id), courseId);

		const thread = await service.getPost(postId.toHexString(), moderator);
		expect(thread?.viewerPermissions.canLock).toBe(true);

		isAssigned.mockResolvedValue(false);
		await expect(service.setLocked(postId.toHexString(), false, moderator)).rejects.toBeInstanceOf(
			AccessDeniedError
		);
		expect(setLockedAt).toHaveBeenCalledTimes(1);
		const afterRemoval = await service.getPost(postId.toHexString(), moderator);
		expect(afterRemoval?.viewerPermissions.canLock).toBe(false);
	});

	it('refuses moderators of another course', async () => {
		const otherCourseQuestion = { ...question, courseId: new ObjectId('000000000000000000000008') };
		const { service, posts, isAssigned } = createService(otherCourseQuestion);
		const setLockedAt = vi.spyOn(posts, 'setLockedAt').mockResolvedValue(true);
		isAssigned.mockImplementation(async (_userId, assignedCourseId) =>
			assignedCourseId.equals(courseId)
		);

		await expect(service.setLocked(postId.toHexString(), true, moderator)).rejects.toBeInstanceOf(
			AccessDeniedError
		);
		const thread = await service.getPost(postId.toHexString(), moderator);
		expect(thread?.viewerPermissions.canLock).toBe(false);
		expect(setLockedAt).not.toHaveBeenCalled();
	});
});
