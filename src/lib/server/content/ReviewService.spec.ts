import { afterEach, describe, expect, it, vi } from 'vitest';
import { MongoServerError, ObjectId } from 'mongodb';
import { CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import { AcademicHistoryRepository } from '#lib/server/history/AcademicHistoryRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDetail } from './Post.ts';
import { PostRepository } from './PostRepository.ts';
import { ReviewRepository } from './ReviewRepository.ts';
import { ReviewService } from './ReviewService.ts';

const author: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'review-author',
	role: 'member',
	status: 'active',
	profile: {
		username: 'alex_m',
		displayName: 'Alex M',
		primaryInstitutionId: '000000000000000000000009',
		isPrimaryInstitutionHidden: false
	}
};
const courseId = new ObjectId('000000000000000000000002');
const spaceId = new ObjectId('000000000000000000000003');
const entryId = new ObjectId('000000000000000000000004');
const postId = new ObjectId('000000000000000000000005');
const attempt = {
	_id: entryId,
	status: 'taking' as const,
	term: { season: 'fall' as const, year: 2026 }
};
const request = {
	historyEntryId: entryId.toHexString(),
	acknowledgedStatus: 'taking',
	acknowledgedTerm: { season: 'fall', year: 2026 },
	disclosureAcknowledged: true,
	title: '  Start the project early  ',
	bodyMarkdown: 'The labs are useful.',
	workload: 4,
	wouldTakeAgain: false
};

function createService() {
	const reviews = new ReviewRepository();
	const posts = new PostRepository();
	const histories = new AcademicHistoryRepository();
	const courses = new CourseRepository();
	vi.spyOn(DatabaseIndexInitializer, 'ensureIndexes').mockResolvedValue();
	vi.spyOn(courses, 'findSpaceId').mockResolvedValue(spaceId);
	vi.spyOn(reviews, 'findIdByAuthor').mockResolvedValue(null);
	vi.spyOn(histories, 'findReviewAttempt').mockResolvedValue(attempt);
	vi.spyOn(posts, 'insert').mockResolvedValue();
	return {
		service: new ReviewService(reviews, posts, histories, courses),
		reviews,
		posts,
		histories,
		courses
	};
}

afterEach(() => vi.restoreAllMocks());

describe('review service', () => {
	it('publishes only the caller’s selected participation snapshot, ignoring forged fields', async () => {
		const { service, posts, histories } = createService();
		const result = await service.createReview(
			courseId.toHexString(),
			{
				...request,
				authorId: '000000000000000000000099',
				courseId: '000000000000000000000099',
				reviewData: { status: 'took', term: { season: 'spring', year: 2000 } },
				visibility: 'visible',
				state: 'removed',
				privateNote: 'Never publish this.'
			},
			author
		);

		expect(histories.findReviewAttempt).toHaveBeenCalledWith(
			entryId,
			new ObjectId(author.id),
			courseId
		);
		expect(posts.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				courseId,
				authorId: new ObjectId(author.id),
				kind: 'review',
				title: 'Start the project early',
				state: 'published',
				reviewData: {
					status: 'taking',
					term: attempt.term,
					workload: 4,
					wouldTakeAgain: false
				}
			})
		);
		expect(result).toMatchObject({
			kind: 'created',
			post: { viewerPermissions: { canEditReview: true, canChooseAcceptedReply: false } }
		});
		expect(JSON.stringify(result)).not.toContain('privateNote');
		expect(JSON.stringify(result)).not.toContain('visibility');
	});

	it('requires disclosure acknowledgement and valid ratings before any write', async () => {
		const { service, posts } = createService();
		for (const invalid of [
			{ disclosureAcknowledged: false },
			{ workload: 0 },
			{ workload: 6 },
			{ workload: 2.5 },
			{ wouldTakeAgain: 'false' }
		]) {
			await expect(
				service.createReview(courseId.toHexString(), { ...request, ...invalid }, author)
			).rejects.toThrow();
		}
		expect(posts.insert).not.toHaveBeenCalled();
	});

	it('refuses an entry whose status or term changed after the disclosure was acknowledged', async () => {
		const { service, posts } = createService();
		for (const changed of [
			{ acknowledgedStatus: 'took' },
			{ acknowledgedTerm: { season: 'spring', year: 2026 } },
			{ acknowledgedTerm: { season: 'fall', year: 2025 } }
		]) {
			expect(
				await service.createReview(courseId.toHexString(), { ...request, ...changed }, author)
			).toEqual({ kind: 'history-required' });
		}
		expect(posts.insert).not.toHaveBeenCalled();
	});

	it('refuses a nonqualifying, missing, other-owner, or other-course attempt', async () => {
		const { service, posts, histories } = createService();
		vi.spyOn(histories, 'findReviewAttempt').mockResolvedValue(null);

		expect(await service.createReview(courseId.toHexString(), request, author)).toEqual({
			kind: 'history-required'
		});
		expect(posts.insert).not.toHaveBeenCalled();
	});

	it('reports both an existing review and a concurrent duplicate as conflicts', async () => {
		const { service, reviews, posts } = createService();
		const findExisting = vi.spyOn(reviews, 'findIdByAuthor').mockResolvedValue(postId);
		expect(await service.createReview(courseId.toHexString(), request, author)).toEqual({
			kind: 'review-exists'
		});
		expect(posts.insert).not.toHaveBeenCalled();

		findExisting.mockResolvedValueOnce(null).mockResolvedValue(postId);
		vi.spyOn(posts, 'insert').mockRejectedValue(
			new MongoServerError({ code: 11000, message: 'Duplicate' })
		);
		expect(await service.createReview(courseId.toHexString(), request, author)).toEqual({
			kind: 'review-exists'
		});
	});

	it('edits only feedback and ratings without rechecking history or changing activity', async () => {
		const { service, reviews, posts, histories } = createService();
		const updateOwned = vi.spyOn(reviews, 'updateOwned').mockResolvedValue(true);
		const published: PostDetail = {
			_id: postId,
			courseId,
			kind: 'review',
			authorId: new ObjectId(author.id),
			author: { username: 'alex_m', displayName: 'Alex M' },
			title: 'Updated review',
			bodyMarkdown: 'Updated feedback.',
			reviewData: { status: 'taking', term: attempt.term, workload: 2, wouldTakeAgain: true },
			replyCount: 0,
			acceptedReplyId: null,
			lockedAt: null,
			createdAt: new Date('2026-11-01'),
			lastActivityAt: new Date('2026-11-01'),
			editedAt: new Date('2026-11-14')
		};
		vi.spyOn(posts, 'findById').mockResolvedValue(published);
		const changes = {
			title: 'Updated review',
			bodyMarkdown: 'Updated feedback.',
			workload: 2,
			wouldTakeAgain: true
		};
		const result = await service.updateReview(
			postId.toHexString(),
			{ ...changes, courseId: new ObjectId().toHexString(), status: 'took', term: null },
			author
		);

		expect(updateOwned).toHaveBeenCalledWith(
			postId,
			new ObjectId(author.id),
			changes,
			expect.any(Date)
		);
		expect(histories.findReviewAttempt).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			reviewData: published.reviewData,
			lastActivityAt: published.lastActivityAt.toISOString(),
			editedAt: published.editedAt?.toISOString()
		});
	});

	it('returns not found when an edit does not match a published, owned review', async () => {
		const { service, reviews, posts } = createService();
		vi.spyOn(reviews, 'updateOwned').mockResolvedValue(false);
		const findPost = vi.spyOn(posts, 'findById');

		expect(await service.updateReview(postId.toHexString(), request, author)).toBeNull();
		expect(findPost).not.toHaveBeenCalled();
	});

	it('exposes only the caller’s attempt fields and statistics in the review context', async () => {
		const { service, reviews, histories } = createService();
		vi.spyOn(reviews, 'getStatistics').mockResolvedValue({
			reviewCount: 0,
			averageWorkload: null,
			wouldTakeAgainPercentage: null
		});
		vi.spyOn(histories, 'findReviewAttempts').mockResolvedValue([attempt]);

		const context = await service.getCourseContext(courseId.toHexString(), author);
		expect(histories.findReviewAttempts).toHaveBeenCalledWith(new ObjectId(author.id), courseId);
		expect(context).toEqual({
			statistics: { reviewCount: 0, averageWorkload: null, wouldTakeAgainPercentage: null },
			ownReviewId: null,
			attempts: [{ id: entryId.toHexString(), status: 'taking', term: attempt.term }]
		});
	});

	it('refuses publishing without a profile or an existing course', async () => {
		const { service, courses, posts } = createService();
		await expect(
			service.createReview(courseId.toHexString(), request, { ...author, profile: null })
		).rejects.toMatchObject({ code: 'onboarding-required' });
		vi.spyOn(courses, 'findSpaceId').mockResolvedValue(null);
		expect(await service.createReview(courseId.toHexString(), request, author)).toEqual({
			kind: 'course-not-found'
		});
		expect(posts.insert).not.toHaveBeenCalled();
	});
});
