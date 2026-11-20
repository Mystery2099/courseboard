import { ObjectId } from 'mongodb';

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

	/** Expects a cursor already checked with `timestampIdCursorSchema`. */
	static parse(cursor: string): TimestampIdPosition {
		const [milliseconds, id] = cursor.split('_');
		return { at: new Date(Number(milliseconds)), id: new ObjectId(id) };
	}
}
