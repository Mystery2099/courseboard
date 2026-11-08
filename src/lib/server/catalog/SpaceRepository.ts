import type { ClientSession, Collection } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { SPACES_COLLECTION_NAME, type SpaceDocument } from './Space.ts';

export class SpaceRepository {
	private collection(): Collection<SpaceDocument> {
		return mongoClientProvider.getDatabase().collection<SpaceDocument>(SPACES_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		// One canonical space per course.
		await this.collection().createIndex({ courseId: 1 }, { unique: true });
	}

	async insert(space: SpaceDocument, session: ClientSession): Promise<void> {
		await this.collection().insertOne(space, { session });
	}
}

export const spaceRepository = new SpaceRepository();
