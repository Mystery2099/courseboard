import type { ObjectId } from 'mongodb';

export const INSTITUTIONS_COLLECTION_NAME = 'institutions';

export interface InstitutionDocument {
	_id: ObjectId;
	name: string;
	/** Lowercased with collapsed whitespace; unique, so one school isn't listed twice. */
	normalizedName: string;
	createdAt: Date;
}

export function normalizeInstitutionName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
