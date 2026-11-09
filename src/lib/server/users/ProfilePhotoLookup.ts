import { clerkClient } from 'svelte-clerk/server';

/** Profile photos are uploaded through Clerk's account settings and stay there. */
export class ProfilePhotoLookup {
	/** A stalled Clerk request shouldn't hold up the profile page; initials are shown instead. */
	private static readonly TIMEOUT_MILLISECONDS = 3_000;

	/** Null when the user has no photo or Clerk can't be reached in time. */
	async findImageUrl(clerkUserId: string): Promise<string | null> {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const timeout = new Promise<never>((_, reject) => {
			timer = setTimeout(
				() => reject(new Error('The Clerk photo lookup timed out.')),
				ProfilePhotoLookup.TIMEOUT_MILLISECONDS
			);
		});
		try {
			const clerkUser = await Promise.race([clerkClient.users.getUser(clerkUserId), timeout]);
			return clerkUser.hasImage ? clerkUser.imageUrl : null;
		} catch (cause) {
			console.warn('Could not load a Clerk profile photo:', cause);
			return null;
		} finally {
			clearTimeout(timer);
		}
	}
}

export const profilePhotoLookup = new ProfilePhotoLookup();
