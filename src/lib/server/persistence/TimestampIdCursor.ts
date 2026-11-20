import { ObjectId, type Document } from 'mongodb';

/** Where a page ended: the ordering date of its last document, with the document's id as tie-breaker. */
export interface TimestampIdPosition {
	at: Date;
	id: ObjectId;
}

/** The `nextCursor` of a page ordered by date then id, as `<milliseconds>_<hex id>`. */
export class TimestampIdCursor {
	static format(at: Date, id: ObjectId): string {
		return `${at.getTime()}_${id.toHexString()}`;
	}

	/**
	 * Matches documents after `position` in newest-first order of `field`, then id. Written as an
	 * upper bound plus an exclusion rather than an `$or`, so an index scan starts at the cursor
	 * instead of at the newest document.
	 */
	static olderThan(field: string, position: TimestampIdPosition): Document {
		return {
			[field]: { $lte: position.at },
			$nor: [{ [field]: position.at, _id: { $gte: position.id } }]
		};
	}

	/** Expects a cursor already checked with `timestampIdCursorSchema`. */
	static parse(cursor: string): TimestampIdPosition {
		const [milliseconds, id] = cursor.split('_');
		return { at: new Date(Number(milliseconds)), id: new ObjectId(id) };
	}
}
