import { expect, it, vi } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { postService } from './PostService.ts';
import { reactionService } from './ReactionService.ts';
import { replyService } from './ReplyService.ts';

const testMongoDbUri = process.env.TEST_MONGODB_URI;

function createUser(username: string): ApplicationUser {
	return {
		id: new ObjectId().toHexString(),
		clerkUserId: username,
		role: 'member',
		status: 'active',
		profile: {
			username,
			displayName: username,
			primaryInstitutionId: new ObjectId().toHexString(),
			isPrimaryInstitutionHidden: false
		}
	};
}

/** Opt in against a throwaway local replica set, never the application's configured database. */
it.skipIf(!testMongoDbUri)(
	'keeps one of each emoji per person and counts reactions per thread in MongoDB',
	async () => {
		if (!testMongoDbUri || !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(testMongoDbUri)) {
			throw new Error('TEST_MONGODB_URI must point to a local 127.0.0.1 port.');
		}
		const client = new MongoClient(testMongoDbUri);
		const database = client.db(`reaction_verification_${new ObjectId().toHexString()}`);
		vi.spyOn(mongoClientProvider, 'getDatabase').mockReturnValue(database);
		vi.spyOn(mongoClientProvider, 'startSession').mockImplementation(() => client.startSession());
		try {
			await client.connect();
			await DatabaseIndexInitializer.ensureIndexes();
			const firstUser = createUser('first_student');
			const secondUser = createUser('second_student');
			const courseId = new ObjectId();
			await database
				.collection('courses')
				.insertOne({ _id: courseId, spaceId: new ObjectId(), institutionId: new ObjectId() });
			await database.collection('users').insertMany(
				[firstUser, secondUser].map((user) => ({
					_id: new ObjectId(user.id),
					clerkUserId: user.clerkUserId,
					username: user.profile?.username,
					displayName: user.profile?.displayName
				}))
			);
			const created = await postService.createPost(
				courseId.toHexString(),
				{ kind: 'question', title: 'Lab 3', bodyMarkdown: 'Which index?' },
				firstUser
			);
			if (created.kind !== 'created') throw new Error('The post was not created.');
			const postId = created.post.id;
			const reply = await replyService.createReply(
				postId,
				{ bodyMarkdown: 'The compound one.', submissionId: crypto.randomUUID() },
				secondUser
			);
			if (reply.kind !== 'created') throw new Error('The reply was not created.');
			const replyId = reply.reply.id;
			const postBefore = await database.collection('posts').findOne({ _id: new ObjectId(postId) });

			const concurrentAdds = await Promise.all(
				Array.from({ length: 4 }, () =>
					reactionService.addReaction(postId, replyId, 'thanks', firstUser)
				)
			);
			expect(concurrentAdds).toEqual(Array(4).fill({ kind: 'saved' }));
			await reactionService.addReaction(postId, replyId, 'thanks', secondUser);
			await reactionService.addReaction(postId, null, 'thumbs-up', secondUser);
			await reactionService.addReaction(postId, null, 'heart', secondUser);
			expect(await database.collection('reactions').countDocuments()).toBe(4);

			expect(await reactionService.listThreadReactions(postId, firstUser)).toEqual({
				kind: 'found',
				reactions: {
					post: [
						{ emoji: 'thumbs-up', count: 1, reactedByViewer: false },
						{ emoji: 'heart', count: 1, reactedByViewer: false }
					],
					replies: { [replyId]: [{ emoji: 'thanks', count: 2, reactedByViewer: true }] }
				}
			});

			await reactionService.removeReaction(postId, replyId, 'thanks', firstUser);
			await reactionService.removeReaction(postId, replyId, 'thanks', firstUser);
			expect(await reactionService.listThreadReactions(postId, firstUser)).toMatchObject({
				reactions: {
					replies: { [replyId]: [{ emoji: 'thanks', count: 1, reactedByViewer: false }] }
				}
			});

			// Reactions never touch the post, so nothing that orders or lists posts can see them.
			expect(await database.collection('posts').findOne({ _id: new ObjectId(postId) })).toEqual(
				postBefore
			);

			const queryPlan = await database
				.collection('reactions')
				.find({ postId: new ObjectId(postId) })
				.explain('executionStats');
			expect(JSON.stringify(queryPlan.queryPlanner.winningPlan)).toContain('IXSCAN');
		} finally {
			await database.dropDatabase();
			await client.close();
			vi.restoreAllMocks();
		}
	},
	30_000
);
