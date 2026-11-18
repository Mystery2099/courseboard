import { ObjectId } from 'mongodb';
import {
	courseSubscriptionRequestSchema,
	type CourseSubscriptionRefusalReason
} from '#lib/contracts/RealtimeContract.ts';
import { AccessDeniedError, AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from '#lib/server/users/ApplicationUserRepository.ts';

export type CourseSubscriptionDecision =
	| { kind: 'allowed'; courseId: string }
	| { kind: 'refused'; reason: CourseSubscriptionRefusalReason };

/**
 * Decides whether a socket may hear a course's events. Every admitted account can read every
 * course, so this applies the same check as the course APIs. The account is read again on each
 * request, so a suspension after the handshake stops new subscriptions.
 */
export class CourseSubscriptionService {
	constructor(
		private readonly users: ApplicationUserRepository,
		private readonly courses: CourseRepository
	) {}

	async authorize(clerkUserId: string, request: unknown): Promise<CourseSubscriptionDecision> {
		const parsedRequest = courseSubscriptionRequestSchema.safeParse(request);
		if (!parsedRequest.success) return { kind: 'refused', reason: 'invalid-request' };
		try {
			AccessPolicy.requireAdmittedUser(await this.users.findByClerkUserId(clerkUserId));
		} catch (error) {
			if (error instanceof AccessDeniedError) return { kind: 'refused', reason: 'access-denied' };
			throw error;
		}
		const { courseId } = parsedRequest.data;
		const spaceId = await this.courses.findSpaceId(new ObjectId(courseId));
		return spaceId
			? { kind: 'allowed', courseId }
			: { kind: 'refused', reason: 'course-not-found' };
	}
}

export const courseSubscriptionService = new CourseSubscriptionService(
	applicationUserRepository,
	courseRepository
);
