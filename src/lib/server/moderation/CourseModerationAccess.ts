import { ObjectId } from 'mongodb';
import { AccessDeniedError } from '#lib/server/access/AccessPolicy.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	moderatorAssignmentRepository,
	type ModeratorAssignmentRepository
} from './ModeratorAssignmentRepository.ts';

/**
 * Who may moderate a course: administrators everywhere, and moderators only in the courses
 * assigned to them. Callers pass a user who has already passed `AccessPolicy`'s admission check.
 */
export class CourseModerationAccess {
	constructor(private readonly assignments: ModeratorAssignmentRepository) {}

	async canModerate(user: ApplicationUser, courseId: ObjectId): Promise<boolean> {
		if (user.role === 'administrator') return true;
		return this.assignments.isAssigned(new ObjectId(user.id), courseId);
	}

	async requireModerator(user: ApplicationUser, courseId: ObjectId): Promise<void> {
		if (!(await this.canModerate(user, courseId))) {
			throw new AccessDeniedError(
				'forbidden',
				"Only this course's moderators and administrators can do this."
			);
		}
	}
}

export const courseModerationAccess = new CourseModerationAccess(moderatorAssignmentRepository);
