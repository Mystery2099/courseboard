import { expect, it, vi } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { postService } from '#lib/server/content/PostService.ts';
import { replyService } from '#lib/server/content/ReplyService.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser, AccountStatus } from '#lib/server/users/ApplicationUser.ts';
import { mentionService } from './MentionService.ts';

const testMongoDbUri = process.env.TEST_MONGODB_URI;

function createUser(username: string, status: AccountStatus = 'active'): ApplicationUser {
	return {
		id: new ObjectId().toHexString(),
		clerkUserId: username,
		role: 'member',
		status,
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
	'stores checked mentions on posts and replies and lists only readable ones',
	async () => {
		if (!testMongoDbUri || !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(testMongoDbUri)) {
			throw new Error('TEST_MONGODB_URI must point to a local 127.0.0.1 port.');
		}
		const client = new MongoClient(testMongoDbUri);
		const database = client.db(`mention_verification_${new ObjectId().toHexString()}`);
		vi.spyOn(mongoClientProvider, 'getDatabase').mockReturnValue(database);
		vi.spyOn(mongoClientProvider, 'startSession').mockImplementation(() => client.startSession());
		try {
			await client.connect();
			await DatabaseIndexInitializer.ensureIndexes();
			const author = createUser('mention_author');
			const reader = createUser('mention_reader');
			const suspended = createUser('mention_suspended', 'suspended');
			const courseId = new ObjectId();
			await database.collection('courses').insertOne({
				_id: courseId,
				code: 'CISY 2253',
				spaceId: new ObjectId(),
				institutionId: new ObjectId()
			});
			await database.collection('users').insertMany(
				[author, reader, suspended].map((user) => ({
					_id: new ObjectId(user.id),
					clerkUserId: user.clerkUserId,
					status: user.status,
					username: user.profile?.username,
					displayName: user.profile?.displayName
				}))
			);

			const created = await postService.createPost(
				courseId.toHexString(),
				{
					kind: 'question',
					title: 'Lab 3',
					bodyMarkdown: 'Hey @Mention_Reader and @mention_suspended, which index?'
				},
				author
			);
			if (created.kind !== 'created') throw new Error('The post was not created.');
			expect(created.post.mentionedUsernames).toEqual(['mention_reader']);
			const reply = await replyService.createReply(
				created.post.id,
				{ bodyMarkdown: 'Also @mention_reader, see above.', submissionId: crypto.randomUUID() },
				author
			);
			if (reply.kind !== 'created') throw new Error('The reply was not created.');
			expect(reply.reply.mentionedUsernames).toEqual(['mention_reader']);

			const removed = await postService.createPost(
				courseId.toHexString(),
				{ kind: 'discussion', title: 'Gone', bodyMarkdown: 'Ping @mention_reader' },
				author
			);
			if (removed.kind !== 'created') throw new Error('The post was not created.');
			await database
				.collection('posts')
				.updateOne({ _id: new ObjectId(removed.post.id) }, { $set: { state: 'removed' } });

			const firstPage = await mentionService.listMentions({}, reader);
			expect(firstPage.mentions.map((mention) => [mention.postId, mention.replyId])).toEqual([
				[created.post.id, reply.reply.id],
				[created.post.id, null]
			]);
			expect(firstPage.mentions[0]).toMatchObject({
				courseCode: 'CISY 2253',
				postKind: 'question',
				postTitle: 'Lab 3',
				author: { username: 'mention_author', displayName: 'mention_author' },
				excerpt: 'Also @mention_reader, see above.'
			});
			expect(firstPage.nextCursor).toBeNull();
			expect((await mentionService.listMentions({}, author)).mentions).toEqual([]);

			const plan = await database
				.collection('replies')
				.find({ 'mentions.userId': new ObjectId(reader.id) })
				.sort({ createdAt: -1, _id: -1 })
				.explain('queryPlanner');
			expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain(
				'mentions.userId_1_createdAt_-1__id_-1'
			);
		} finally {
			await database.dropDatabase().catch(() => undefined);
			await client.close();
		}
	}
);
