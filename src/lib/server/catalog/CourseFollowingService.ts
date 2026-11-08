import { ObjectId } from 'mongodb';
import { courseIdSchema } from '#lib/contracts/CourseCatalogContract.ts';
import type {
	FollowedCourseListResponse,
	FollowingStateResponse
} from '#lib/contracts/CourseFollowingContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { courseRepository, type CourseRepository } from './CourseRepository.ts';
import { membershipRepository, type MembershipRepository } from './MembershipRepository.ts';

/**
 * Following puts a course in the user's navigation. It never reads or writes academic history, so
 * following a course is not a claim of having taken it.
 */
export class CourseFollowingService {
	/** Followed courses are navigation shortcuts; this keeps the list a usable length. */
	private static readonly FOLLOWED_COURSE_LIMIT = 100;

	constructor(
		private readonly courses: CourseRepository,
		private readonly memberships: MembershipRepository
	) {}

	/** Returns null when the course doesn't exist. */
	async followCourse(
		courseId: string,
		actor: ApplicationUser | null
	): Promise<FollowingStateResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const course = await this.findCourseSpace(courseId);
		if (!course) return null;
		// The unique (userId, spaceId) index is what keeps concurrent follows from duplicating.
		await DatabaseIndexInitializer.ensureIndexes();
		await this.memberships.insertIfAbsent(
			new ObjectId(user.id),
			course.spaceId,
			course.courseId,
			new Date()
		);
		return { isFollowed: true };
	}

	/** Returns null when the course doesn't exist. */
	async unfollowCourse(
		courseId: string,
		actor: ApplicationUser | null
	): Promise<FollowingStateResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const course = await this.findCourseSpace(courseId);
		if (!course) return null;
		await this.memberships.delete(new ObjectId(user.id), course.spaceId);
		return { isFollowed: false };
	}

	async listFollowedCourses(actor: ApplicationUser | null): Promise<FollowedCourseListResponse> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const courses = await this.memberships.findFollowedCourses(
			new ObjectId(user.id),
			CourseFollowingService.FOLLOWED_COURSE_LIMIT
		);
		return {
			courses: courses.map((course) => ({
				id: course.courseId.toHexString(),
				code: course.code,
				title: course.title,
				institutionName: course.institutionName
			}))
		};
	}

	private async findCourseSpace(
		courseId: string
	): Promise<{ courseId: ObjectId; spaceId: ObjectId } | null> {
		const parsedCourseId = courseIdSchema.safeParse(courseId);
		if (!parsedCourseId.success) return null;
		const id = new ObjectId(parsedCourseId.data);
		const spaceId = await this.courses.findSpaceId(id);
		return spaceId ? { courseId: id, spaceId } : null;
	}
}

export const courseFollowingService = new CourseFollowingService(
	courseRepository,
	membershipRepository
);
