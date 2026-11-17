import { MongoServerError } from 'mongodb';

const DUPLICATE_KEY_ERROR_CODE = 11000;

export class MongoErrorClassifier {
	/** True when a write broke a unique index. */
	static isDuplicateKeyError(cause: unknown): boolean {
		return cause instanceof MongoServerError && cause.code === DUPLICATE_KEY_ERROR_CODE;
	}
}
