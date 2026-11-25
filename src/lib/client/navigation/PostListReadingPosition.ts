import type { ReviewListFilters } from '#lib/client/content/PostApiClient.ts';
import type { PostKind, PostListFilter } from '#lib/contracts/PostContract.ts';

/** NN/g suggests starting fresh after 30–60 minutes; see student-feature-research.md. */
export const READING_POSITION_LIFETIME_MS = 30 * 60_000;

export interface PostListReadingPosition {
	filter: PostListFilter;
	reviewFilters: ReviewListFilters;
	/** The first post row still on screen, and how far its top was from the top of the window. */
	anchorPostId: string;
	anchorTop: number;
	/** The thread the reader opened, which gets focus back. */
	openedPostId: string;
	loadedPageCount: number;
	savedAt: number;
}

/**
 * Where the reader was in each course list when they opened a thread. Kept in memory for this tab,
 * so a reload starts fresh; switching accounts clears it with the query cache.
 */
export class PostListReadingPositions {
	private static readonly positions = new Map<string, PostListReadingPosition>();

	static save(courseId: string, kind: PostKind | null, position: PostListReadingPosition): void {
		PostListReadingPositions.positions.set(PostListReadingPositions.key(courseId, kind), position);
	}

	/** Removes and returns the saved position, unless it's too old to be worth restoring. */
	static take(
		courseId: string,
		kind: PostKind | null,
		now: number = Date.now()
	): PostListReadingPosition | null {
		const key = PostListReadingPositions.key(courseId, kind);
		const position = PostListReadingPositions.positions.get(key);
		PostListReadingPositions.positions.delete(key);
		if (!position || now - position.savedAt > READING_POSITION_LIFETIME_MS) return null;
		return position;
	}

	static clear(): void {
		PostListReadingPositions.positions.clear();
	}

	private static key(courseId: string, kind: PostKind | null): string {
		return `${courseId}:${kind ?? 'overview'}`;
	}
}
