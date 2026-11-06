import { invitationRepository } from '#lib/server/admission/InvitationRepository.ts';
import { applicationUserRepository } from '#lib/server/users/ApplicationUserRepository.ts';

const RETRY_DELAY_MILLISECONDS = 30_000;

/**
 * Creates the indexes that enforce identities (unique Clerk user IDs and invitation token hashes)
 * and support current queries. `createIndex` is idempotent, so this runs on every start and keeps
 * retrying in the background while MongoDB is unreachable.
 */
export class DatabaseIndexInitializer {
	static ensureIndexesInBackground(): void {
		void DatabaseIndexInitializer.ensureIndexes().catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			console.error(`Could not create MongoDB indexes; retrying in 30 seconds: ${reason}`);
			setTimeout(
				DatabaseIndexInitializer.ensureIndexesInBackground,
				RETRY_DELAY_MILLISECONDS
			).unref();
		});
	}

	private static async ensureIndexes(): Promise<void> {
		await Promise.all([
			applicationUserRepository.ensureIndexes(),
			invitationRepository.ensureIndexes()
		]);
	}
}
