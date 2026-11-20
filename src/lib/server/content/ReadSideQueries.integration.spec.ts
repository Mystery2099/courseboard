import { expect, it, vi } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import type { PostListResponse, ReviewListOrder } from '#lib/contracts/PostContract.ts';
import type { ProfileActivityPageResponse } from '#lib/contracts/ProfileActivityContract.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDocument } from './Post.ts';
import { postService } from './PostService.ts';
import { profileActivityService } from './ProfileActivityService.ts';
import type { ReplyDocument } from './Reply.ts';

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

async function readAllPages<Page extends { nextCursor: string | null }>(
	readPage: (after: string | undefined) => Promise<Page | null>
): Promise<Page[]> {
	const pages: Page[] = [];
	let after: string | undefined;
	do {
		const page = await readPage(after);
		if (!page) throw new Error('The list was not found.');
		pages.push(page);
		after = page.nextCursor ?? undefined;
	} while (after);
	return pages;
}

/** Opt in against a throwaway local replica set, never the application's configured database. */
it.skipIf(!testMongoDbUri)(
	'pages filtered reviews and a profile owner’s own activity in order, once each',
	async () => {
		if (!testMongoDbUri || !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(testMongoDbUri)) {
			throw new Error('TEST_MONGODB_URI must point to a local 127.0.0.1 port.');
		}
		const client = new MongoClient(testMongoDbUri);
		const database = client.db(`read_side_verification_${new ObjectId().toHexString()}`);
		vi.spyOn(mongoClientProvider, 'getDatabase').mockReturnValue(database);
		try {
			await client.connect();
			await DatabaseIndexInitializer.ensureIndexes();
			const owner = createUser('profile_owner');
			const otherStudent = createUser('other_student');
			const courseId = new ObjectId();
			const spaceId = new ObjectId();
			await database.collection('users').insertMany(
				[owner, otherStudent].map((user) => ({
					_id: new ObjectId(user.id),
					clerkUserId: user.clerkUserId,
					username: user.profile?.username,
					displayName: user.profile?.displayName
				}))
			);
			await database
				.collection('courses')
				.insertOne({ _id: courseId, spaceId, code: 'CISY 8503', normalizedCode: 'CISY8503' });

			// Reviews share timestamps in pairs so the id tie-breaker is exercised too.
			const start = Date.UTC(2026, 10, 1);
			const reviews: PostDocument[] = Array.from({ length: 47 }, (_, index) => {
				const createdAt = new Date(start + Math.floor(index / 2) * 60_000);
				return {
					_id: new ObjectId(),
					spaceId,
					courseId,
					kind: 'review',
					authorId: new ObjectId(),
					title: `Review ${index}`,
					bodyMarkdown: 'Body',
					replyCount: 0,
					acceptedReplyId: null,
					lockedAt: null,
					state: index % 11 === 0 ? 'removed' : 'published',
					createdAt,
					lastActivityAt: new Date(createdAt.getTime() + (index % 7) * 3_600_000),
					reviewData: {
						status: 'took',
						term: { season: 'fall', year: 2025 },
						workload: (index % 5) + 1,
						wouldTakeAgain: index % 3 !== 0
					}
				};
			});
			await database.collection<PostDocument>('posts').insertMany(reviews);
			// Lists join each author's name, so every reviewer needs an account.
			await database.collection('users').insertMany(
				reviews.map((review, index) => ({
					_id: review.authorId,
					clerkUserId: `reviewer_${index}`,
					username: `reviewer_${index}`,
					displayName: `Reviewer ${index}`
				}))
			);
			const published = reviews.filter((review) => review.state === 'published');

			const filterCases: {
				filter: ReviewListOrder;
				workload?: number;
				wouldTakeAgain?: 'yes' | 'no';
			}[] = [
				{ filter: 'active' },
				{ filter: 'newest' },
				{ filter: 'lowest-workload' },
				{ filter: 'highest-workload' },
				{ filter: 'newest', workload: 3 },
				{ filter: 'active', wouldTakeAgain: 'no' },
				{ filter: 'highest-workload', wouldTakeAgain: 'yes' },
				{ filter: 'lowest-workload', workload: 2, wouldTakeAgain: 'yes' }
			];
			for (const query of filterCases) {
				const pages = await readAllPages<PostListResponse>((after) =>
					postService.listPosts(
						courseId.toHexString(),
						{ kind: 'review', ...query, ...(after && { after }) },
						otherStudent
					)
				);
				const orderedBy = query.filter === 'active' ? 'lastActivityAt' : 'createdAt';
				const workloadDirection =
					query.filter === 'lowest-workload' ? 1 : query.filter === 'highest-workload' ? -1 : 0;
				const expected = published
					.filter(
						(review) =>
							(query.workload === undefined || review.reviewData?.workload === query.workload) &&
							(query.wouldTakeAgain === undefined ||
								review.reviewData?.wouldTakeAgain === (query.wouldTakeAgain === 'yes'))
					)
					.sort(
						(first, second) =>
							workloadDirection *
								((first.reviewData?.workload ?? 0) - (second.reviewData?.workload ?? 0)) ||
							second[orderedBy].getTime() - first[orderedBy].getTime() ||
							second._id.toHexString().localeCompare(first._id.toHexString())
					)
					.map((review) => review._id.toHexString());
				expect(
					pages.flatMap((page) => page.posts.map((post) => post.id)),
					JSON.stringify(query)
				).toEqual(expected);
			}
			await expect(
				postService.listPosts(
					courseId.toHexString(),
					{ kind: 'question', filter: 'lowest-workload' },
					otherStudent
				)
			).rejects.toThrow();
			await expect(
				postService.listPosts(
					courseId.toHexString(),
					{ kind: 'review', filter: 'lowest-workload', after: `1794000000000_${courseId}` },
					otherStudent
				)
			).rejects.toThrow();

			// The owner's activity: two questions, a review, and 25 replies, one under a removed post.
			const ownerId = new ObjectId(owner.id);
			const threadPost = (
				authorId: ObjectId,
				kind: PostDocument['kind'],
				minute: number,
				state: PostDocument['state'] = 'published'
			): PostDocument => {
				const { reviewData, ...postFields } = reviews[1];
				return {
					...postFields,
					_id: new ObjectId(),
					kind,
					authorId,
					title: `${kind} ${minute}`,
					state,
					createdAt: new Date(start + minute * 60_000),
					lastActivityAt: new Date(start + minute * 60_000),
					...(kind === 'review' && { reviewData })
				};
			};
			const ownQuestions = [
				threadPost(ownerId, 'question', 1),
				threadPost(ownerId, 'discussion', 2)
			];
			const ownReview = threadPost(ownerId, 'review', 3);
			const removedPost = threadPost(new ObjectId(otherStudent.id), 'question', 4, 'removed');
			const othersPost = threadPost(new ObjectId(otherStudent.id), 'discussion', 5);
			await database
				.collection<PostDocument>('posts')
				.insertMany([...ownQuestions, ownReview, removedPost, othersPost]);
			const reply = (authorId: ObjectId, postId: ObjectId, second: number): ReplyDocument => ({
				_id: new ObjectId(),
				postId,
				parentReplyId: null,
				authorId,
				bodyMarkdown: `**Reply** ${second}`,
				submissionId: crypto.randomUUID(),
				createdAt: new Date(start + 600_000 + Math.floor(second / 3) * 1000)
			});
			const ownReplies = Array.from({ length: 24 }, (_, second) =>
				reply(ownerId, othersPost._id, second)
			);
			await database
				.collection<ReplyDocument>('replies')
				.insertMany([
					...ownReplies,
					reply(ownerId, removedPost._id, 30),
					reply(new ObjectId(otherStudent.id), othersPost._id, 31)
				]);

			const readActivity = (type: string, actor: ApplicationUser) =>
				readAllPages<ProfileActivityPageResponse>((after) =>
					profileActivityService.listOwnActivity({ type, ...(after && { after }) }, actor)
				);
			const postPages = await readActivity('posts', owner);
			expect(
				postPages.flatMap((page) => (page.type === 'replies' ? [] : page.posts.map((p) => p.id)))
			).toEqual(ownQuestions.map((post) => post._id.toHexString()).reverse());
			const reviewPages = await readActivity('reviews', owner);
			expect(reviewPages[0]).toMatchObject({
				type: 'reviews',
				posts: [{ id: ownReview._id.toHexString(), course: { code: 'CISY 8503' } }]
			});
			const replyPages = await readActivity('replies', owner);
			expect(replyPages).toHaveLength(2);
			const listedReplies = replyPages.flatMap((page) =>
				page.type === 'replies' ? page.replies : []
			);
			expect(listedReplies.map((listed) => listed.id)).toEqual(
				[...ownReplies]
					.sort(
						(first, second) =>
							second.createdAt.getTime() - first.createdAt.getTime() ||
							second._id.toHexString().localeCompare(first._id.toHexString())
					)
					.map((listed) => listed._id.toHexString())
			);
			expect(listedReplies[0]).toMatchObject({
				postId: othersPost._id.toHexString(),
				postTitle: othersPost.title,
				excerpt: 'Reply 23'
			});
			const otherStudentReplies = await readActivity('replies', otherStudent);
			expect(
				otherStudentReplies.flatMap((page) => (page.type === 'replies' ? page.replies : []))
			).toHaveLength(1);
		} finally {
			await database.dropDatabase().catch(() => undefined);
			await client.close();
		}
	},
	30_000
);
