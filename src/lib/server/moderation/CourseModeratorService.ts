import { ObjectId } from 'mongodb';
import {
	assignModeratorSchema,
	moderatorAssignmentIdSchema,
	type ModeratorAssignmentListResponse,
	type ModeratorAssignmentResponse,
	type ModeratorAssignmentResult
} from '#lib/contracts/ModeratorAssignmentContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from '#lib/server/users/ApplicationUserRepository.ts';
import type { ModeratorAssignmentSummary } from './ModeratorAssignment.ts';
import {
	moderatorAssignmentRepository,
	type ModeratorAssignmentRepository
} from './ModeratorAssignmentRepository.ts';

/** Administrators assign and remove course moderators. Only onboarded users can be assigned. */
export class CourseModeratorService {
	private static readonly ASSIGNMENT_LIMIT = 200;

	constructor(
		private readonly assignments: ModeratorAssignmentRepository,
		private readonly courses: CourseRepository,
		private readonly users: ApplicationUserRepository
	) {}

	async listAssignments(actor: ApplicationUser | null): Promise<ModeratorAssignmentListResponse> {
		AccessPolicy.requireAdministrator(actor);
		const limit = CourseModeratorService.ASSIGNMENT_LIMIT;
		const summaries = await this.assignments.findSummaries(limit + 1);
		return {
			assignments: summaries.slice(0, limit).map(CourseModeratorService.toResponse),
			hasMoreAssignments: summaries.length > limit
		};
	}

	/** Assigning someone who already moderates the course returns the existing assignment. */
	async assignModerator(
		input: unknown,
		actor: ApplicationUser | null
	): Promise<ModeratorAssignmentResult> {
		const administrator = AccessPolicy.requireAdministrator(actor);
		const request = assignModeratorSchema.parse(input);
		const courseId = new ObjectId(request.courseId);
		const [spaceId, userId] = await Promise.all([
			this.courses.findSpaceId(courseId),
			this.users.findIdByUsername(request.username)
		]);
		if (!spaceId) return { kind: 'course-not-found' };
		if (!userId) return { kind: 'user-not-found' };

		await DatabaseIndexInitializer.ensureIndexes();
		const assignmentId = await this.assignments.insertIfAbsent({
			userId,
			courseId,
			spaceId,
			assignedBy: new ObjectId(administrator.id),
			assignedAt: new Date()
		});
		const summary = await this.assignments.findSummaryById(assignmentId);
		if (!summary) throw new Error('A stored moderator assignment could not be read back.');
		return { kind: 'assigned', assignment: CourseModeratorService.toResponse(summary) };
	}

	/** Returns false when the assignment doesn't exist or the id is malformed. */
	async removeAssignment(assignmentId: string, actor: ApplicationUser | null): Promise<boolean> {
		AccessPolicy.requireAdministrator(actor);
		const parsedAssignmentId = moderatorAssignmentIdSchema.safeParse(assignmentId);
		if (!parsedAssignmentId.success) return false;
		return this.assignments.delete(new ObjectId(parsedAssignmentId.data));
	}

	private static toResponse(summary: ModeratorAssignmentSummary): ModeratorAssignmentResponse {
		return {
			id: summary._id.toHexString(),
			course: {
				id: summary.course._id.toHexString(),
				code: summary.course.code,
				title: summary.course.title,
				institutionName: summary.course.institutionName
			},
			moderator: summary.moderator,
			assignedAt: summary.assignedAt.toISOString()
		};
	}
}

export const courseModeratorService = new CourseModeratorService(
	moderatorAssignmentRepository,
	courseRepository,
	applicationUserRepository
);
