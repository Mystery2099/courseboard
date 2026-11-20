import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDocument } from './Post.ts';
import { PostRepository } from './PostRepository.ts';
import { ReactionRepository } from './ReactionRepository.ts';
import { ReactionService } from './ReactionService.ts';
import { ReplyRepository } from './ReplyRepository.ts';

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
const courseId = new ObjectId('000000000000000000000003');
const postId = new ObjectId('000000000000000000000005');
const replyId = new ObjectId('000000000000000000000006');

function createService(kind: PostDocument['kind'] = 'question') {
	const reactions = new ReactionRepository();
	const posts = new PostRepository();
	const replies = new ReplyRepository();
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(posts, 'findKindAndCourse').mockResolvedValue({ kind, courseId });
	const findPlacement = vi
		.spyOn(replies, 'findPlacement')
		.mockResolvedValue({ postId, parentReplyId: null });
	const insert = vi.spyOn(reactions, 'insert').mockResolvedValue(true);
	const events = {
		publishPostCreated: vi.fn(),
		publishReplyCreated: vi.fn(),
		publishReactionChanged: vi.fn(),
		publishMentionCreated: vi.fn()
	};
	return {
		service: new ReactionService(reactions, posts, replies, events),
		reactions,
		findPlacement,
		insert,
		events
	};
}

afterEach(() => vi.restoreAllMocks());

describe('reaction service', () => {
	it("stores the caller's reaction on the reply and announces it to the course", async () => {
		const { service, insert, events } = createService();

		const result = await service.addReaction(
			postId.toHexString(),
			replyId.toHexString(),
			'thanks',
			student
		);

		expect(result).toEqual({ kind: 'saved' });
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				postId,
				replyId,
				userId: new ObjectId(student.id),
				emoji: 'thanks'
			})
		);
		expect(events.publishReactionChanged).toHaveBeenCalledWith({
			courseId: courseId.toHexString(),
			postId: postId.toHexString()
		});
	});

	it("doesn't announce a reaction the person had already made", async () => {
		const { service, insert, events } = createService();
		insert.mockResolvedValue(false);

		expect(await service.addReaction(postId.toHexString(), null, 'heart', student)).toEqual({
			kind: 'saved'
		});
		expect(events.publishReactionChanged).not.toHaveBeenCalled();
	});

	it('refuses reactions anywhere in a review thread', async () => {
		const { service, insert } = createService('review');

		expect(
			await service.addReaction(postId.toHexString(), replyId.toHexString(), 'heart', student)
		).toEqual({ kind: 'reactions-not-allowed' });
		expect(await service.listThreadReactions(postId.toHexString(), student)).toEqual({
			kind: 'reactions-not-allowed'
		});
		expect(insert).not.toHaveBeenCalled();
	});

	it('refuses a reply that belongs to another post', async () => {
		const { service, findPlacement, insert } = createService();
		findPlacement.mockResolvedValue({ postId: new ObjectId(), parentReplyId: null });

		expect(
			await service.addReaction(postId.toHexString(), replyId.toHexString(), 'heart', student)
		).toEqual({ kind: 'reply-not-found' });
		expect(insert).not.toHaveBeenCalled();
	});

	it('rejects an emoji outside the fixed set', async () => {
		const { service } = createService();

		await expect(
			service.addReaction(postId.toHexString(), null, 'skull', student)
		).rejects.toThrow();
	});

	it('groups counts by target in the fixed emoji order', async () => {
		const { service, reactions } = createService();
		vi.spyOn(reactions, 'countForThread').mockResolvedValue([
			{ replyId, emoji: 'thanks', count: 1, reactedByViewer: false },
			{ replyId: null, emoji: 'heart', count: 2, reactedByViewer: true },
			{ replyId: null, emoji: 'thumbs-up', count: 1, reactedByViewer: false }
		]);

		expect(await service.listThreadReactions(postId.toHexString(), student)).toEqual({
			kind: 'found',
			reactions: {
				post: [
					{ emoji: 'thumbs-up', count: 1, reactedByViewer: false },
					{ emoji: 'heart', count: 2, reactedByViewer: true }
				],
				replies: {
					[replyId.toHexString()]: [{ emoji: 'thanks', count: 1, reactedByViewer: false }]
				}
			}
		});
	});
});
