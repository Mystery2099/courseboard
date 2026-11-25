import { expect, it, vi } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import { academicHistoryRepository } from '#lib/server/history/AcademicHistoryRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { postRepository } from './PostRepository.ts';
import { postService } from './PostService.ts';
import { replyService } from './ReplyService.ts';
import { reviewService } from './ReviewService.ts';

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
	'enforces review uniqueness, privacy, snapshots, statistics, and replies in MongoDB',
	async () => {
		if (!testMongoDbUri || !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(testMongoDbUri)) {
			throw new Error('TEST_MONGODB_URI must point to a local 127.0.0.1 port.');
		}
		const client = new MongoClient(testMongoDbUri);
		const database = client.db(`review_verification_${new ObjectId().toHexString()}`);
		vi.spyOn(mongoClientProvider, 'getDatabase').mockReturnValue(database);
		vi.spyOn(mongoClientProvider, 'startSession').mockImplementation(() => client.startSession());
		try {
			await client.connect();
			await DatabaseIndexInitializer.ensureIndexes();
			const firstUser = createUser('first_student');
			const secondUser = createUser('second_student');
			const courseId = new ObjectId();
			const otherCourseId = new ObjectId();
			await database.collection('courses').insertMany([
				{
					_id: courseId,
					spaceId: new ObjectId(),
					institutionId: new ObjectId(),
					normalizedCode: 'CISY8503'
				},
				{
					_id: otherCourseId,
					spaceId: new ObjectId(),
					institutionId: new ObjectId(),
					normalizedCode: 'CISY8504'
				}
			]);
			await database.collection('users').insertMany(
				[firstUser, secondUser].map((user) => ({
					_id: new ObjectId(user.id),
					clerkUserId: user.clerkUserId,
					username: user.profile?.username,
					displayName: user.profile?.displayName,
					privateField: 'Must not appear in bylines'
				}))
			);
			const firstEntryId = new ObjectId();
			const secondEntryId = new ObjectId();
			const planningEntryId = new ObjectId();
			const otherCourseEntryId = new ObjectId();
			const historyEntries = [
				{
					_id: firstEntryId,
					userId: new ObjectId(firstUser.id),
					courseId,
					status: 'taking' as const
				},
				{
					_id: secondEntryId,
					userId: new ObjectId(secondUser.id),
					courseId,
					status: 'took' as const
				},
				{
					_id: planningEntryId,
					userId: new ObjectId(secondUser.id),
					courseId,
					status: 'planning' as const
				},
				{
					_id: otherCourseEntryId,
					userId: new ObjectId(secondUser.id),
					courseId: otherCourseId,
					status: 'took' as const
				}
			];
			for (const entry of historyEntries) {
				await academicHistoryRepository.insertUnlessDuplicate({
					...entry,
					term: entry.status === 'planning' ? null : { season: 'fall', year: 2026 },
					visibility: 'private',
					privateNote: 'Never disclose this note',
					createdAt: new Date(),
					updatedAt: new Date()
				});
			}
			const request = {
				historyEntryId: firstEntryId.toHexString(),
				acknowledgedStatus: 'taking',
				acknowledgedTerm: { season: 'fall', year: 2026 },
				disclosureAcknowledged: true,
				title: 'A useful course',
				bodyMarkdown: 'Start the project early.',
				workload: 4,
				wouldTakeAgain: false
			};
			for (const historyEntryId of [firstEntryId, planningEntryId, otherCourseEntryId]) {
				expect(
					await reviewService.createReview(
						courseId.toHexString(),
						{ ...request, historyEntryId: historyEntryId.toHexString() },
						secondUser
					)
				).toEqual({ kind: 'history-required' });
			}
			const concurrentResults = await Promise.all(
				Array.from({ length: 4 }, () =>
					reviewService.createReview(courseId.toHexString(), request, firstUser)
				)
			);
			expect(concurrentResults.filter((result) => result.kind === 'created')).toHaveLength(1);
			expect(concurrentResults.filter((result) => result.kind === 'review-exists')).toHaveLength(3);
			const created = concurrentResults.find((result) => result.kind === 'created');
			if (!created || created.kind !== 'created') throw new Error('No review was created.');
			const firstReview = created.post;
			expect(
				await database.collection('academicHistories').findOne({ _id: firstEntryId })
			).toMatchObject({
				visibility: 'private',
				privateNote: 'Never disclose this note'
			});
			expect(await database.collection('memberships').countDocuments()).toBe(0);

			const secondResult = await reviewService.createReview(
				courseId.toHexString(),
				{
					...request,
					historyEntryId: secondEntryId.toHexString(),
					acknowledgedStatus: 'took',
					workload: 2,
					wouldTakeAgain: true
				},
				secondUser
			);
			expect(secondResult.kind).toBe('created');
			const hiddenReviews = ['removed', 'deleted'].map((state) => ({
				_id: new ObjectId(),
				courseId,
				authorId: new ObjectId(),
				kind: 'review',
				state,
				lockedAt: null,
				reviewData: { workload: 5, wouldTakeAgain: false }
			}));
			await database.collection('posts').insertMany(hiddenReviews);
			// A removed or deleted post can't be locked, even by a caller that read it moments before.
			for (const review of hiddenReviews) {
				expect(await postRepository.setLockedAt(review._id, new Date())).toBeNull();
			}
			expect(await database.collection('posts').countDocuments({ lockedAt: { $ne: null } })).toBe(
				0
			);
			const context = await reviewService.getCourseContext(courseId.toHexString(), secondUser);
			expect(context?.statistics).toEqual({
				reviewCount: 2,
				averageWorkload: 3,
				wouldTakeAgainPercentage: 50
			});
			expect(context?.attempts.map((attempt) => attempt.id)).toEqual([secondEntryId.toHexString()]);
			expect(JSON.stringify(context)).not.toMatch(/privateNote|visibility|Never disclose/);
			const overview = await postService.listPosts(courseId.toHexString(), {}, secondUser);
			expect(overview?.posts).toHaveLength(2);
			expect(overview?.posts.every((post) => post.kind === 'review')).toBe(true);
			expect(JSON.stringify(overview)).not.toMatch(/privateField|privateNote|visibility/);

			await academicHistoryRepository.deleteOwned(firstEntryId, new ObjectId(firstUser.id));
			const changes = {
				title: 'Updated experience',
				bodyMarkdown: 'The project was worthwhile.',
				workload: 3,
				wouldTakeAgain: true,
				reviewData: { status: 'took', term: { season: 'spring', year: 2000 } }
			};
			expect(await reviewService.updateReview(firstReview.id, changes, secondUser)).toBeNull();
			expect(
				await reviewService.updateReview(firstReview.id, changes, {
					...secondUser,
					role: 'administrator'
				})
			).toBeNull();
			const edited = await reviewService.updateReview(firstReview.id, changes, firstUser);
			expect(edited).toMatchObject({
				reviewData: {
					status: 'taking',
					term: { season: 'fall', year: 2026 },
					workload: 3,
					wouldTakeAgain: true
				},
				lastActivityAt: firstReview.lastActivityAt,
				viewerPermissions: { canEditReview: true, canChooseAcceptedReply: false }
			});
			expect(edited?.editedAt).toBeDefined();
			expect(
				(await reviewService.getCourseContext(courseId.toHexString(), firstUser))?.statistics
			).toEqual({
				reviewCount: 2,
				averageWorkload: 2.5,
				wouldTakeAgainPercentage: 100
			});
			const reply = await replyService.createReply(
				firstReview.id,
				{ bodyMarkdown: 'Agreed.', submissionId: crypto.randomUUID() },
				secondUser
			);
			expect(reply.kind).toBe('created');
			expect((await postService.getPost(firstReview.id, secondUser))?.replyCount).toBe(1);
			expect(await postService.clearAcceptedReply(firstReview.id, firstUser)).toEqual({
				kind: 'not-a-question'
			});

			const queryPlan = await database
				.collection('posts')
				.find({
					courseId,
					kind: 'review',
					state: 'published'
				})
				.explain('executionStats');
			expect(JSON.stringify(queryPlan.queryPlanner.winningPlan)).toContain('IXSCAN');
			console.info('Review query plan:', JSON.stringify(queryPlan.queryPlanner.winningPlan));
		} finally {
			await database.dropDatabase();
			await client.close();
			vi.restoreAllMocks();
		}
	},
	30_000
);
