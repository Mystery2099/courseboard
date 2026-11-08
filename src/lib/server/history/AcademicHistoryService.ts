import { ObjectId } from 'mongodb';
import {
	createHistoryEntrySchema,
	historyEntryIdSchema,
	updateHistoryEntrySchema,
	type HistoryCourseResponse,
	type HistoryEntryCreationResult,
	type OwnHistoryEntryResponse,
	type OwnHistoryResponse,
	type VisibleHistoryResponse
} from '#lib/contracts/AcademicHistoryContract.ts';
import { usernameSchema } from '#lib/contracts/UserProfileContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { courseRepository, type CourseRepository } from '#lib/server/catalog/CourseRepository.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from '#lib/server/users/ApplicationUserRepository.ts';
import type { HistoryEntryCourse, OwnHistoryEntry } from './AcademicHistoryEntry.ts';
import {
	academicHistoryRepository,
	type AcademicHistoryRepository
} from './AcademicHistoryRepository.ts';

/**
 * Self-reported course history. Entries are private until their owner marks one visible, and only
 * the owner ever reads private entries or notes; administrators get no exception. History never
 * reads or writes following, so neither implies the other.
 */
export class AcademicHistoryService {
	/** A student records dozens of entries, not thousands; this keeps every history one bounded read. */
	private static readonly ENTRY_LIMIT = 200;

	constructor(
		private readonly entries: AcademicHistoryRepository,
		private readonly courses: CourseRepository,
		private readonly users: ApplicationUserRepository
	) {}

	async listOwnEntries(actor: ApplicationUser | null): Promise<OwnHistoryResponse> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const entries = await this.entries.findOwnEntries(
			new ObjectId(user.id),
			AcademicHistoryService.ENTRY_LIMIT
		);
		return { entries: entries.map(AcademicHistoryService.toOwnEntryResponse) };
	}

	/**
	 * Another user's visible entries. Returns null when no onboarded user has that username; a user
	 * with only private entries gets the same empty list as a user with none.
	 */
	async listVisibleEntries(
		username: string,
		actor: ApplicationUser | null
	): Promise<VisibleHistoryResponse | null> {
		AccessPolicy.requireAdmittedUser(actor);
		const parsedUsername = usernameSchema.safeParse(username);
		if (!parsedUsername.success) return null;
		const userId = await this.users.findIdByUsername(parsedUsername.data);
		if (!userId) return null;
		const entries = await this.entries.findVisibleEntries(
			userId,
			AcademicHistoryService.ENTRY_LIMIT
		);
		return {
			entries: entries.map((entry) => ({
				id: entry._id.toHexString(),
				course: AcademicHistoryService.toCourseResponse(entry.course),
				status: entry.status,
				term: entry.term
			}))
		};
	}

	async createEntry(
		input: unknown,
		actor: ApplicationUser | null
	): Promise<HistoryEntryCreationResult> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const request = createHistoryEntrySchema.parse(input);
		const userId = new ObjectId(user.id);
		const courseId = new ObjectId(request.courseId);
		if (!(await this.courses.findById(courseId))) return { kind: 'course-not-found' };
		if ((await this.entries.countByUser(userId)) >= AcademicHistoryService.ENTRY_LIMIT) {
			return { kind: 'entry-limit-reached' };
		}

		const entryId = new ObjectId();
		const now = new Date();
		await this.entries.insert({
			_id: entryId,
			userId,
			courseId,
			status: request.status,
			term: request.term,
			visibility: request.visibility,
			privateNote: request.privateNote,
			createdAt: now,
			updatedAt: now
		});
		const entry = await this.entries.findOwnEntry(entryId, userId);
		if (!entry) return { kind: 'course-not-found' };
		return { kind: 'created', entry: AcademicHistoryService.toOwnEntryResponse(entry) };
	}

	/** Returns null when the entry doesn't exist or belongs to someone else. */
	async updateEntry(
		entryId: string,
		input: unknown,
		actor: ApplicationUser | null
	): Promise<OwnHistoryEntryResponse | null> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const parsedEntryId = historyEntryIdSchema.safeParse(entryId);
		if (!parsedEntryId.success) return null;
		const changes = updateHistoryEntrySchema.parse(input);
		const id = new ObjectId(parsedEntryId.data);
		const userId = new ObjectId(user.id);
		if (!(await this.entries.updateOwned(id, userId, changes, new Date()))) return null;
		const entry = await this.entries.findOwnEntry(id, userId);
		return entry ? AcademicHistoryService.toOwnEntryResponse(entry) : null;
	}

	/** Returns false when the entry doesn't exist or belongs to someone else. */
	async deleteEntry(entryId: string, actor: ApplicationUser | null): Promise<boolean> {
		const user = AccessPolicy.requireAdmittedUser(actor);
		const parsedEntryId = historyEntryIdSchema.safeParse(entryId);
		if (!parsedEntryId.success) return false;
		return this.entries.deleteOwned(new ObjectId(parsedEntryId.data), new ObjectId(user.id));
	}

	private static toOwnEntryResponse(entry: OwnHistoryEntry): OwnHistoryEntryResponse {
		return {
			id: entry._id.toHexString(),
			course: AcademicHistoryService.toCourseResponse(entry.course),
			status: entry.status,
			term: entry.term,
			visibility: entry.visibility,
			privateNote: entry.privateNote
		};
	}

	private static toCourseResponse(course: HistoryEntryCourse): HistoryCourseResponse {
		return {
			id: course.courseId.toHexString(),
			code: course.code,
			title: course.title,
			institution: { id: course.institutionId.toHexString(), name: course.institutionName }
		};
	}
}

export const academicHistoryService = new AcademicHistoryService(
	academicHistoryRepository,
	courseRepository,
	applicationUserRepository
);
