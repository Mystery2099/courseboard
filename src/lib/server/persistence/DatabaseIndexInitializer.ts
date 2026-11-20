import { invitationRepository } from '#lib/server/admission/InvitationRepository.ts';
import { courseRepository } from '#lib/server/catalog/CourseRepository.ts';
import { institutionRepository } from '#lib/server/catalog/InstitutionRepository.ts';
import { membershipRepository } from '#lib/server/catalog/MembershipRepository.ts';
import { spaceRepository } from '#lib/server/catalog/SpaceRepository.ts';
import { authorActivityRepository } from '#lib/server/content/AuthorActivityRepository.ts';
import { postRepository } from '#lib/server/content/PostRepository.ts';
import { reactionRepository } from '#lib/server/content/ReactionRepository.ts';
import { replyRepository } from '#lib/server/content/ReplyRepository.ts';
import { reviewRepository } from '#lib/server/content/ReviewRepository.ts';
import { academicHistoryRepository } from '#lib/server/history/AcademicHistoryRepository.ts';
import { mentionRepository } from '#lib/server/mentions/MentionRepository.ts';
import { moderatorAssignmentRepository } from '#lib/server/moderation/ModeratorAssignmentRepository.ts';
import { applicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';
import { peopleSearchRepository } from '#lib/server/users/PeopleSearchRepository.ts';

const RETRY_DELAY_MILLISECONDS = 30_000;

/**
 * Creates the indexes that enforce identities (Clerk user IDs, invitation token hashes, institution
 * names, course codes per institution, one space per course, one membership per user and space,
 * one reply per submission, one of each emoji per person and target, one review per author and
 * course, one moderator assignment per user and course) and support current queries.
 * `createIndex` is idempotent, so this runs on every start.
 *
 * Writes that rely on a unique index await `ensureIndexes()` first, so no duplicate can be
 * written before the index exists (which would also make the index impossible to build).
 */
export class DatabaseIndexInitializer {
	private static pendingCreation: Promise<void> | null = null;

	/** Resolves once the indexes exist. After a failure, the next call tries again. */
	static ensureIndexes(): Promise<void> {
		DatabaseIndexInitializer.pendingCreation ??= DatabaseIndexInitializer.createIndexes().catch(
			(error: unknown) => {
				DatabaseIndexInitializer.pendingCreation = null;
				throw error;
			}
		);
		return DatabaseIndexInitializer.pendingCreation;
	}

	/** Starts creating indexes at startup, retrying while MongoDB is unreachable. */
	static ensureIndexesInBackground(): void {
		DatabaseIndexInitializer.ensureIndexes().catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			console.error(`Could not create MongoDB indexes; retrying in 30 seconds: ${reason}`);
			setTimeout(
				DatabaseIndexInitializer.ensureIndexesInBackground,
				RETRY_DELAY_MILLISECONDS
			).unref();
		});
	}

	private static async createIndexes(): Promise<void> {
		await Promise.all([
			applicationUserRepository.ensureIndexes(),
			invitationRepository.ensureIndexes(),
			institutionRepository.ensureIndexes(),
			courseRepository.ensureIndexes(),
			spaceRepository.ensureIndexes(),
			membershipRepository.ensureIndexes(),
			academicHistoryRepository.ensureIndexes(),
			postRepository.ensureIndexes(),
			authorActivityRepository.ensureIndexes(),
			replyRepository.ensureIndexes(),
			reactionRepository.ensureIndexes(),
			mentionRepository.ensureIndexes(),
			reviewRepository.ensureIndexes(),
			moderatorAssignmentRepository.ensureIndexes(),
			peopleSearchRepository.ensureIndexes()
		]);
	}
}
