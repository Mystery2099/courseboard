import { afterAll, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { postService } from './PostService.ts';
import { replyService } from './ReplyService.ts';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { MONGODB_URI } from '$app/env/private';

const log = (...parts: unknown[]) => appendFileSync('/tmp/claude-1000/-home-mathew-Projects-nosql-academic-platform/02be12fa-028b-42c0-9039-d6c59cc53823/scratchpad/mongo-check.log', parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ') + '\n');

function user(id: ObjectId, username: string, role: 'member' | 'administrator'): ApplicationUser {
	return {
		id: id.toHexString(),
		clerkUserId: username,
		role,
		status: 'active',
		profile: {
			username,
			displayName: username.toUpperCase(),
			primaryInstitutionId: new ObjectId().toHexString(),
			isPrimaryInstitutionHidden: false
		}
	};
}

afterAll(() => mongoClientProvider.close());

describe('real mongo', () => {
	it('runs the thread workflow', async () => {
		if (!MONGODB_URI.startsWith('mongodb://127.0.0.1:27018/')) throw new Error('not the throwaway container');
		const db = mongoClientProvider.getDatabase();
		await db.dropDatabase();
		await DatabaseIndexInitializer.ensureIndexes();
		const ids = { a: new ObjectId(), b: new ObjectId(), admin: new ObjectId() };
		const a = user(ids.a, 'asker', 'member');
		const b = user(ids.b, 'helper', 'member');
		const admin = user(ids.admin, 'boss', 'administrator');
		await db.collection('users').insertMany(
			[a, b, admin].map((u) => ({
				_id: new ObjectId(u.id),
				clerkUserId: u.clerkUserId,
				role: u.role,
				status: 'active',
				username: u.profile!.username,
				displayName: u.profile!.displayName,
				secretField: 'must-not-leak'
			}))
		);
		const courseId = new ObjectId();
		const spaceId = new ObjectId();
		await db.collection('courses').insertOne({ _id: courseId, spaceId, code: 'X', normalizedCode: 'X', institutionId: new ObjectId() });
		const cid = courseId.toHexString();

		const q = await postService.createPost(cid, { kind: 'question', title: 'Q1', bodyMarkdown: 'body' }, a);
		if (q.kind !== 'created') throw new Error('q');
		await new Promise((r) => setTimeout(r, 20));
		const d = await postService.createPost(cid, { kind: 'discussion', title: 'D1', bodyMarkdown: 'body' }, b);
		if (d.kind !== 'created') throw new Error('d');
		const qid = q.post.id;

		const r1 = await replyService.createReply(qid, { bodyMarkdown: 'answer', submissionId: randomUUID() }, b);
		if (r1.kind !== 'created') throw new Error('r1');
		const nested = await replyService.createReply(qid, { bodyMarkdown: 'thanks', submissionId: randomUUID(), parentReplyId: r1.reply.id }, a);
		if (nested.kind !== 'created') throw new Error('nested');
		const tooDeep = await replyService.createReply(qid, { bodyMarkdown: 'deep', submissionId: randomUUID(), parentReplyId: nested.reply.id }, b);
		log('nested-on-nested:', tooDeep.kind);
		const otherPost = await replyService.createReply(d.post.id, { bodyMarkdown: 'x', submissionId: randomUUID(), parentReplyId: r1.reply.id }, b);
		log('parent from other post:', otherPost.kind);

		const dup = randomUUID();
		const dups = await Promise.all(
			[1, 2, 3, 4].map(() => replyService.createReply(qid, { bodyMarkdown: 'same', submissionId: dup }, b))
		);
		log('duplicate submission ids:', new Set(dups.map((r) => (r.kind === 'created' ? r.reply.id : r.kind))).size,
			'docs:', await db.collection('replies').countDocuments({ submissionId: dup }));

		await Promise.all(
			[1, 2, 3, 4, 5, 6].map((n) => replyService.createReply(qid, { bodyMarkdown: `c${n}`, submissionId: randomUUID() }, n % 2 ? a : b))
		);
		const stored = await db.collection('replies').countDocuments({ postId: new ObjectId(qid) });
		let post = await postService.getPost(qid, a);
		log('stored replies', stored, 'replyCount', post!.replyCount);
		expect(post!.replyCount).toBe(stored);

		const activityBefore = post!.lastActivityAt;
		await expect(postService.chooseAcceptedReply(qid, { replyId: r1.reply.id }, b)).rejects.toThrow();
		const accepted = await postService.chooseAcceptedReply(qid, { replyId: r1.reply.id }, a);
		log('accept:', accepted.kind);
		const foreign = await replyService.createReply(d.post.id, { bodyMarkdown: 'in d', submissionId: randomUUID() }, a);
		if (foreign.kind !== 'created') throw new Error('foreign');
		log('accept reply of other post:', (await postService.chooseAcceptedReply(qid, { replyId: foreign.reply.id }, a)).kind);
		log('accept on discussion:', (await postService.chooseAcceptedReply(d.post.id, { replyId: foreign.reply.id }, b)).kind);

		await expect(postService.setLocked(qid, true, a)).rejects.toThrow();
		await postService.setLocked(qid, true, admin);
		log('reply when locked:', (await replyService.createReply(qid, { bodyMarkdown: 'late', submissionId: randomUUID() }, b)).kind);
		post = await postService.getPost(qid, b);
		log('after lock+accept: replyCount', post!.replyCount, 'activity unchanged', post!.lastActivityAt === activityBefore,
			'locked', post!.isLocked, 'accepted', post!.acceptedReplyId === r1.reply.id, 'perm', JSON.stringify(post!.viewerPermissions));
		log('raw post detail keys:', Object.keys(post!).join(','), 'author:', JSON.stringify(post!.author));
		await postService.setLocked(qid, false, admin);
		log('reply after unlock:', (await replyService.createReply(qid, { bodyMarkdown: 'ok', submissionId: randomUUID() }, b)).kind);
		log('clear accepted:', (await postService.clearAcceptedReply(qid, a)).kind, (await postService.getPost(qid, a))!.acceptedReplyId);

		const q2 = await postService.createPost(cid, { kind: 'question', title: 'Q2 unanswered', bodyMarkdown: 'b' }, b);
		const titles = async (query: object) => (await postService.listPosts(cid, query, a))!.posts.map((p) => p.title);
		log('overview active:', await titles({}));
		log('questions active:', await titles({ kind: 'question' }));
		log('questions newest:', await titles({ kind: 'question', filter: 'newest' }));
		log('questions unanswered:', await titles({ kind: 'question', filter: 'unanswered' }));
		log('discussion:', await titles({ kind: 'discussion' }));
		void q2;

		const replies1 = await replyService.listReplies(qid, {}, a);
		log('reply order ok:', replies1!.replies.map((r) => r.bodyMarkdown).slice(0, 3), 'keys', Object.keys(replies1!.replies[0]).join(','));

		// pagination
		const now = Date.now();
		await db.collection('posts').insertMany(
			Array.from({ length: 45 }, (_, n) => ({
				spaceId, courseId, kind: n % 3 ? 'question' : 'discussion', authorId: ids.a, title: `bulk ${n}`, bodyMarkdown: 'x',
				replyCount: 0, acceptedReplyId: null, lockedAt: null,
				createdAt: new Date(now - n * 1000), lastActivityAt: new Date(now - (n % 5) * 1000)
			}))
		);
		for (const query of [{}, { kind: 'question', filter: 'newest' }, { kind: 'question', filter: 'unanswered' }] as Record<string, string>[]) {
			const seen: string[] = [];
			let after: string | null = null;
			let pages = 0;
			do {
				const page = await postService.listPosts(cid, { ...query, ...(after && { after }) }, a);
				seen.push(...page!.posts.map((p) => p.id));
				after = page!.nextCursor;
				pages++;
			} while (after);
			log('paged', JSON.stringify(query), 'pages', pages, 'posts', seen.length, 'unique', new Set(seen).size);
		}
		const replyPosts = Array.from({ length: 70 }, (_, n) => ({ postId: new ObjectId(d.post.id), parentReplyId: null, authorId: ids.b, bodyMarkdown: `r${n}`, submissionId: randomUUID(), createdAt: new Date() }));
		await db.collection('replies').insertMany(replyPosts);
		{
			const seen: string[] = [];
			let after: string | null = null;
			do {
				const page = await replyService.listReplies(d.post.id, after ? { after } : {}, a);
				seen.push(...page!.replies.map((r) => r.id));
				after = page!.nextCursor;
			} while (after);
			log('reply paging', seen.length, new Set(seen).size, 'sorted', seen.join() === [...seen].sort().join());
		}

		const stages = (plan: unknown) => [...JSON.stringify(plan).matchAll(/"stage":"(\w+)"/g)].map((m) => m[1]).join('>');
		const posts = db.collection('posts');
		const ex = async (filter: object, sort: object) => {
			const e = await posts.find(filter).sort(sort as never).limit(21).explain('executionStats');
			return `${stages(e.queryPlanner.winningPlan)} keys=${e.executionStats.totalKeysExamined} docs=${e.executionStats.totalDocsExamined} n=${e.executionStats.nReturned}`;
		};
		log('plan overview active:', await ex({ spaceId, kind: { $in: ['question', 'discussion'] } }, { lastActivityAt: -1, _id: -1 }));
		log('plan questions active:', await ex({ spaceId, kind: { $in: ['question'] } }, { lastActivityAt: -1, _id: -1 }));
		log('plan questions newest:', await ex({ spaceId, kind: { $in: ['question'] } }, { createdAt: -1, _id: -1 }));
		log('plan unanswered:', await ex({ spaceId, kind: { $in: ['question'] }, replyCount: 0 }, { createdAt: -1, _id: -1 }));
		const re = await db.collection('replies').find({ postId: new ObjectId(d.post.id), _id: { $gt: new ObjectId(foreign.reply.id) } }).sort({ _id: 1 }).limit(31).explain('executionStats');
		log('plan replies:', stages(re.queryPlanner.winningPlan), re.executionStats.totalKeysExamined, re.executionStats.totalDocsExamined);
	}, 60_000);
});
