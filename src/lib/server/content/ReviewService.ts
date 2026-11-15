import { MongoServerError, ObjectId } from 'mongodb';
import { courseIdSchema } from '#lib/contracts/CourseCatalogContract.ts';
import { postIdSchema, type PostDetailResponse } from '#lib/contracts/PostContract.ts';
import {
	createReviewSchema,
	updateReviewSchema,
	type CourseReviewContextResponse,
	type ReviewCreationResult
} from '#lib/contracts/ReviewContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import {
	academicHistoryRepository,
	type AcademicHistoryRepository
} from '#lib/server/history/AcademicHistoryRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import type { PostDocument } from './Post.ts';
import { postRepository, type PostRepository } from './PostRepository.ts';
import { PostResponseMapper } from './PostResponseMapper.ts';
import { reviewRepository, type ReviewRepository } from './ReviewRepository.ts';

const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Reviews deliberately disclose a participation snapshot. Only publishing reads history, and no
 * review operation changes it or follows a course. Editing remains possible after history changes.
 */
export class ReviewService {
	constructor(
		private readonly reviews: ReviewRepository,
		private readonly posts: PostRepository,
		private readonly histories: AcademicHistoryRepository,
		private readonly courses: CourseRepository
	) {}

	async getCourseContext(
		courseId: string,
		actor: ApplicationUser | null
	): Promise<CourseReviewContextResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const parsedCourseId = courseIdSchema.safeParse(courseId);
		if (!parsedCourseId.success) return null;
		const id = new ObjectId(parsedCourseId.data);
		if (!(await this.courses.findSpaceId(id))) return null;
		const userId = new ObjectId(user.id);
		const [statistics, ownReviewId, attempts] = await Promise.all([
			this.reviews.getStatistics(id),
			this.reviews.findIdByAuthor(id, userId),
			this.histories.findReviewAttempts(userId, id)
		]);
		return {
			statistics,
			ownReviewId: ownReviewId?.toHexString() ?? null,
			attempts: attempts.map((attempt) => ({
				id: attempt._id.toHexString(),
				status: attempt.status,
				term: attempt.term
			}))
		};
	}

	async createReview(
		courseId: string,
		input: unknown,
		actor: ApplicationUser | null
	): Promise<ReviewCreationResult> {
		const author = AccessPolicy.requireOnboardedUser(actor);
		const request = createReviewSchema.parse(input);
		const parsedCourseId = courseIdSchema.safeParse(courseId);
		if (!parsedCourseId.success) return { kind: 'course-not-found' };
		const id = new ObjectId(parsedCourseId.data);
		const spaceId = await this.courses.findSpaceId(id);
		if (!spaceId) return { kind: 'course-not-found' };
		const authorId = new ObjectId(author.id);
		if (await this.reviews.findIdByAuthor(id, authorId)) return { kind: 'review-exists' };
		const attempt = await this.histories.findReviewAttempt(
			new ObjectId(request.historyEntryId),
			authorId,
			id
		);
		if (!attempt) return { kind: 'history-required' };

		const now = new Date();
		const post: PostDocument = {
			_id: new ObjectId(),
			spaceId,
			courseId: id,
			kind: 'review',
			authorId,
			title: request.title,
			bodyMarkdown: request.bodyMarkdown,
			reviewData: {
				status: attempt.status,
				term: attempt.term,
				workload: request.workload,
				wouldTakeAgain: request.wouldTakeAgain
			},
			replyCount: 0,
			acceptedReplyId: null,
			lockedAt: null,
			state: 'published',
			createdAt: now,
			lastActivityAt: now
		};
		await DatabaseIndexInitializer.ensureIndexes();
		try {
			await this.posts.insert(post);
		} catch (cause) {
			if (!(cause instanceof MongoServerError) || cause.code !== DUPLICATE_KEY_ERROR_CODE) {
				throw cause;
			}
			if (!(await this.reviews.findIdByAuthor(id, authorId))) throw cause;
			return { kind: 'review-exists' };
		}
		const { username, displayName } = author.profile;
		return {
			kind: 'created',
			post: PostResponseMapper.toDetailResponse({ ...post, author: { username, displayName } }, author)
		};
	}

	/** An unknown review, another author's review, and removed content all answer not found. */
	async updateReview(
		postId: string,
		input: unknown,
		actor: ApplicationUser | null
	): Promise<PostDetailResponse | null> {
		const author = AccessPolicy.requireOnboardedUser(actor);
		const parsedPostId = postIdSchema.safeParse(postId);
		if (!parsedPostId.success) return null;
		const changes = updateReviewSchema.parse(input);
		const id = new ObjectId(parsedPostId.data);
		if (!(await this.reviews.updateOwned(id, new ObjectId(author.id), changes, new Date()))) {
			return null;
		}
		const post = await this.posts.findById(id);
		return post ? PostResponseMapper.toDetailResponse(post, author) : null;
	}
}

export const reviewService = new ReviewService(
	reviewRepository,
	postRepository,
	academicHistoryRepository,
	courseRepository
);
