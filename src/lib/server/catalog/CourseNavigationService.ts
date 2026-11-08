import { ObjectId } from 'mongodb';
import { courseIdSchema } from '#lib/contracts/CourseCatalogContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from '#lib/server/users/ApplicationUserRepository.ts';
import { courseRepository, type CourseRepository } from './CourseRepository.ts';

/** Remembers the last course a user opened so sign-in can resume it. */
export class CourseNavigationService {
	constructor(
		private readonly users: ApplicationUserRepository,
		private readonly courses: CourseRepository
	) {}

	async recordCourseVisit(courseId: string, actor: ApplicationUser | null): Promise<void> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		await this.users.updateLastVisitedCourse(
			new ObjectId(user.id),
			new ObjectId(courseIdSchema.parse(courseId))
		);
	}

	/** The last visited course if it still exists, otherwise null. */
	async findResumableCourseId(actor: ApplicationUser | null): Promise<string | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const courseId = await this.users.findLastVisitedCourseId(new ObjectId(user.id));
		if (!courseId) return null;
		const spaceId = await this.courses.findSpaceId(courseId);
		return spaceId ? courseId.toHexString() : null;
	}
}

export const courseNavigationService = new CourseNavigationService(
	applicationUserRepository,
	courseRepository
);
