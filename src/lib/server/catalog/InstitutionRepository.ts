import type { Collection, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import {
	INSTITUTIONS_COLLECTION_NAME,
	normalizeInstitutionName,
	type InstitutionDocument
} from './Institution.ts';

export type InstitutionSummary = Pick<InstitutionDocument, '_id' | 'name'>;

export class InstitutionRepository {
	private static readonly SUMMARY_PROJECTION = { name: 1 } as const;

	private collection(): Collection<InstitutionDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<InstitutionDocument>(INSTITUTIONS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.collection().createIndex({ normalizedName: 1 }, { unique: true });
	}

	/** Institutions ordered by name. The catalog is administrator-managed, so `limit` is a ceiling. */
	async findAll(limit: number): Promise<InstitutionSummary[]> {
		return this.collection()
			.find(
				{},
				{ projection: InstitutionRepository.SUMMARY_PROJECTION, sort: { normalizedName: 1 }, limit }
			)
			.toArray();
	}

	async findById(institutionId: ObjectId): Promise<InstitutionSummary | null> {
		return this.collection().findOne(
			{ _id: institutionId },
			{ projection: InstitutionRepository.SUMMARY_PROJECTION }
		);
	}

	/** Creates the institution unless one with the same normalized name exists; returns its id. */
	async insertIfAbsent(name: string, createdAt: Date): Promise<{ id: ObjectId; created: boolean }> {
		const normalizedName = normalizeInstitutionName(name);
		const result = await this.collection().findOneAndUpdate(
			{ normalizedName },
			{ $setOnInsert: { name: name.trim(), normalizedName, createdAt } },
			{ upsert: true, returnDocument: 'after', includeResultMetadata: true, projection: { _id: 1 } }
		);
		return { id: result.value!._id, created: !result.lastErrorObject?.updatedExisting };
	}
}

export const institutionRepository = new InstitutionRepository();
