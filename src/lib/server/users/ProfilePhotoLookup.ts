import { clerkClient } from 'svelte-clerk/server';

/** Profile photos are uploaded through Clerk's account settings and stay there. */
export class ProfilePhotoLookup {
	/** Null when the user has no photo or Clerk can't be reached; avatars fall back to initials. */
	async findImageUrl(clerkUserId: string): Promise<string | null> {
		try {
			const clerkUser = await clerkClient.users.getUser(clerkUserId);
			return clerkUser.hasImage ? clerkUser.imageUrl : null;
		} catch (cause) {
			console.warn('Could not load a Clerk profile photo:', cause);
			return null;
		}
	}
}

export const profilePhotoLookup = new ProfilePhotoLookup();
