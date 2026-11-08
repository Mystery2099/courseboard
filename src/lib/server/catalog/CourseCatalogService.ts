import { ObjectId } from 'mongodb';
import {
	courseIdSchema,
	type CourseBrowseQuery,
	type CourseBrowseResponse,
	type CourseDetailResponse,
	type InstitutionListResponse
} from '#lib/contracts/CourseCatalogContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { normalizeCourseCode } from './Course.ts';
import { courseRepository, type CourseRepository } from './CourseRepository.ts';
import { institutionRepository, type InstitutionRepository } from './InstitutionRepository.ts';
import { membershipRepository, type MembershipRepository } from './MembershipRepository.ts';
import { spaceRepository, type SpaceRepository } from './SpaceRepository.ts';

export interface NewCourse {
	institutionId: ObjectId;
	code: string;
	title: string;
	description: string;
}

export interface CatalogEntryCreation {
	id: ObjectId;
	created: boolean;
}

/** Institutions, courses, and their canonical spaces. Any admitted user can browse the catalog. */
export class CourseCatalogService {
	private static readonly INSTITUTION_LIMIT = 200;
	private static readonly COURSE_PAGE_SIZE = 25;

	constructor(
		private readonly institutions: InstitutionRepository,
		private readonly courses: CourseRepository,
		private readonly spaces: SpaceRepository,
		private readonly memberships: MembershipRepository
	) {}

	async listInstitutions(actor: ApplicationUser | null): Promise<InstitutionListResponse> {
		AccessPolicy.requireAdmittedUser(actor);
		const institutions = await this.institutions.findAll(CourseCatalogService.INSTITUTION_LIMIT);
		return {
			institutions: institutions.map((institution) => ({
				id: institution._id.toHexString(),
				name: institution.name
			}))
		};
	}

	/** Returns null when the institution doesn't exist. */
	async browseCourses(
		query: CourseBrowseQuery,
		actor: ApplicationUser | null
	): Promise<CourseBrowseResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const institution = await this.institutions.findById(new ObjectId(query.institutionId));
		if (!institution) return null;

		const pageSize = CourseCatalogService.COURSE_PAGE_SIZE;
		const courses = await this.courses.findPageByInstitution(
			institution._id,
			query.after,
			pageSize + 1
		);
		const page = courses.slice(0, pageSize);
		const followedSpaceIds = await this.memberships.findFollowedSpaceIds(
			new ObjectId(user.id),
			page.map((course) => course.spaceId)
		);
		return {
			institution: { id: institution._id.toHexString(), name: institution.name },
			courses: page.map((course) => ({
				id: course._id.toHexString(),
				code: course.code,
				title: course.title,
				isFollowed: followedSpaceIds.has(course.spaceId.toHexString())
			})),
			nextCursor: courses.length > pageSize ? page[page.length - 1].normalizedCode : null
		};
	}

	/** Returns null when the course doesn't exist or the id is malformed. */
	async getCourse(
		courseId: string,
		actor: ApplicationUser | null
	): Promise<CourseDetailResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const parsedCourseId = courseIdSchema.safeParse(courseId);
		if (!parsedCourseId.success) return null;
		const course = await this.courses.findById(new ObjectId(parsedCourseId.data));
		if (!course) return null;

		const [institution, isFollowed] = await Promise.all([
			this.institutions.findById(course.institutionId),
			this.memberships.exists(new ObjectId(user.id), course.spaceId)
		]);
		if (!institution) return null;
		return {
			id: course._id.toHexString(),
			code: course.code,
			title: course.title,
			description: course.description,
			institution: { id: institution._id.toHexString(), name: institution.name },
			isFollowed
		};
	}

	async createInstitution(
		name: string,
		actor: ApplicationUser | null
	): Promise<CatalogEntryCreation> {
		AccessPolicy.requireAdministrator(actor);
		await DatabaseIndexInitializer.ensureIndexes();
		return this.institutions.insertIfAbsent(name, new Date());
	}

	/**
	 * Creates the course and its canonical space in one transaction, so neither exists without the
	 * other. An existing course with the same code at the institution is left unchanged.
	 */
	async createCourse(
		newCourse: NewCourse,
		actor: ApplicationUser | null
	): Promise<CatalogEntryCreation> {
		AccessPolicy.requireAdministrator(actor);
		const normalizedCode = normalizeCourseCode(newCourse.code);
		await DatabaseIndexInitializer.ensureIndexes();
		const session = mongoClientProvider.startSession();
		try {
			return await session.withTransaction(async () => {
				const existingCourseId = await this.courses.findIdByCode(
					newCourse.institutionId,
					normalizedCode,
					session
				);
				if (existingCourseId) return { id: existingCourseId, created: false };

				const now = new Date();
				const courseId = new ObjectId();
				const spaceId = new ObjectId();
				await this.spaces.insert({ _id: spaceId, courseId, createdAt: now }, session);
				await this.courses.insert(
					{
						_id: courseId,
						institutionId: newCourse.institutionId,
						code: newCourse.code.trim(),
						normalizedCode,
						title: newCourse.title.trim(),
						description: newCourse.description.trim(),
						spaceId,
						createdAt: now
					},
					session
				);
				return { id: courseId, created: true };
			});
		} finally {
			await session.endSession();
		}
	}
}

export const courseCatalogService = new CourseCatalogService(
	institutionRepository,
	courseRepository,
	spaceRepository,
	membershipRepository
);
