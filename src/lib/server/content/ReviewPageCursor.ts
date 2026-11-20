import { isWorkloadOrder, type ReviewListOrder } from '#lib/contracts/PostContract.ts';
import { TimestampIdCursor } from '#lib/server/persistence/TimestampIdCursor.ts';
import type { PostSummary, ReviewPagePosition } from './Post.ts';

/**
 * The `nextCursor` of a review list. Date orders use `<milliseconds>_<hex id>`; workload orders
 * put the last review's workload in front, as `<workload>_<milliseconds>_<hex id>`.
 */
export class ReviewPageCursor {
	static format(order: ReviewListOrder, lastReview: PostSummary): string {
		const orderedAt = order === 'active' ? lastReview.lastActivityAt : lastReview.createdAt;
		const position = TimestampIdCursor.format(orderedAt, lastReview._id);
		return isWorkloadOrder(order) ? `${lastReview.reviewData?.workload}_${position}` : position;
	}

	/** Expects a cursor the list query schema already matched to `order`. */
	static parse(order: ReviewListOrder, cursor: string): ReviewPagePosition {
		if (!isWorkloadOrder(order)) {
			const { at, id } = TimestampIdCursor.parse(cursor);
			return { workload: null, orderedAt: at, postId: id };
		}
		const separator = cursor.indexOf('_');
		const { at, id } = TimestampIdCursor.parse(cursor.slice(separator + 1));
		return { workload: Number(cursor.slice(0, separator)), orderedAt: at, postId: id };
	}
}
