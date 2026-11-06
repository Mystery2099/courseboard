import { invitationRepository } from '#lib/server/admission/InvitationRepository.ts';
import { applicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';

const RETRY_DELAY_MILLISECONDS = 30_000;

/**
 * Creates the indexes that enforce identities (unique Clerk user IDs and invitation token hashes)
 * and support current queries. `createIndex` is idempotent, so this runs on every start.
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
			invitationRepository.ensureIndexes()
		]);
	}
}
