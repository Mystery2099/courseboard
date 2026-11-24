import { expect, it, vi } from 'vitest';
import { Collection, MongoClient, ObjectId, type Document } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDocument } from './Post.ts';
import type { ReplyDocument } from './Reply.ts';
import { replyService } from './ReplyService.ts';

const testMongoDbUri = process.env.TEST_MONGODB_URI;

const student: ApplicationUser = {
	id: new ObjectId().toHexString(),
	clerkUserId: 'linked_reply_student',
	role: 'member',
	status: 'active',
	profile: {
		username: 'linked_reply_student',
		displayName: 'Linked Reply Student',
		primaryInstitutionId: new ObjectId().toHexString(),
		isPrimaryInstitutionHidden: false
	}
};

function createPost(courseId: ObjectId, spaceId: ObjectId): PostDocument {
	const createdAt = new Date('2026-11-01T10:00:00Z');
	return {
		_id: new ObjectId(),
		spaceId,
		courseId,
		kind: 'discussion',
		authorId: new ObjectId(student.id),
		title: 'Study group',
		bodyMarkdown: 'Anyone?',
		replyCount: 0,
		acceptedReplyId: null,
		lockedAt: null,
		createdAt,
		lastActivityAt: createdAt
	};
}

function createReply(postId: ObjectId, parentReplyId: ObjectId | null): ReplyDocument {
	return {
		_id: new ObjectId(),
		postId,
		parentReplyId,
		authorId: new ObjectId(student.id),
		bodyMarkdown: 'Same here.',
		submissionId: crypto.randomUUID(),
		createdAt: new Date()
	};
}

/** Opt in against a throwaway local replica set, never the application's configured database. */
it.skipIf(!testMongoDbUri)(
	'finds a linked reply past the first page by id, only within its own thread',
	async () => {
		if (!testMongoDbUri || !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(testMongoDbUri)) {
			throw new Error('TEST_MONGODB_URI must point to a local 127.0.0.1 port.');
		}
		const client = new MongoClient(testMongoDbUri);
		const database = client.db(`linked_reply_verification_${new ObjectId().toHexString()}`);
		vi.spyOn(mongoClientProvider, 'getDatabase').mockReturnValue(database);
		try {
			await client.connect();
			await DatabaseIndexInitializer.ensureIndexes();
			await database.collection('users').insertOne({
				_id: new ObjectId(student.id),
				clerkUserId: student.clerkUserId,
				username: student.profile?.username,
				displayName: student.profile?.displayName
			});
			const courseId = new ObjectId();
			const spaceId = new ObjectId();
			const thread = createPost(courseId, spaceId);
			const otherThread = createPost(courseId, spaceId);
			await database.collection<PostDocument>('posts').insertMany([thread, otherThread]);

			// Three pages of top-level replies, then one nested under the last, far past the first page.
			const topLevelReplies = Array.from({ length: 70 }, () => createReply(thread._id, null));
			const parentReply = topLevelReplies.at(-1)!;
			const nestedReply = createReply(thread._id, parentReply._id);
			const otherThreadReply = createReply(otherThread._id, null);
			await database
				.collection<ReplyDocument>('replies')
				.insertMany([...topLevelReplies, nestedReply, otherThreadReply]);

			const firstPage = await replyService.listReplies(thread._id.toHexString(), {}, student);
			expect(firstPage?.replies.map((reply) => reply.id)).not.toContain(
				nestedReply._id.toHexString()
			);

			const aggregate = vi.spyOn(Collection.prototype, 'aggregate');
			const linked = await replyService.findLinkedReply(
				thread._id.toHexString(),
				nestedReply._id.toHexString(),
				student
			);
			expect(linked).toMatchObject({
				reply: { id: nestedReply._id.toHexString(), author: { username: 'linked_reply_student' } },
				parentReply: { id: parentReply._id.toHexString(), parentReplyId: null }
			});

			// Each lookup reads one index key and one reply, however long the thread is.
			const pipelines = aggregate.mock.calls
				.filter(
					(_call, index) =>
						(aggregate.mock.contexts[index] as Collection).collectionName === 'replies'
				)
				.map(([pipeline]) => pipeline as Document[]);
			aggregate.mockRestore();
			expect(pipelines).toHaveLength(2);
			for (const pipeline of pipelines) {
				const plan = await database
					.collection('replies')
					.aggregate(pipeline)
					.explain('executionStats');
				const cursorStage = (plan.stages as Document[])[0].$cursor as Document;
				expect(JSON.stringify(cursorStage.queryPlanner.winningPlan)).not.toContain('COLLSCAN');
				expect(cursorStage.executionStats).toMatchObject({
					nReturned: 1,
					totalKeysExamined: 1,
					totalDocsExamined: 1
				});
			}

			// A reply of another thread, or one sent under the wrong thread, isn't found.
			await expect(
				replyService.findLinkedReply(
					thread._id.toHexString(),
					otherThreadReply._id.toHexString(),
					student
				)
			).resolves.toBeNull();
			await expect(
				replyService.findLinkedReply(
					otherThread._id.toHexString(),
					nestedReply._id.toHexString(),
					student
				)
			).resolves.toBeNull();
		} finally {
			await database.dropDatabase().catch(() => undefined);
			await client.close();
		}
	}
);
