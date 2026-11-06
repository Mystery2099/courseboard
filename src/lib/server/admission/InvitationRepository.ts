import type { ClientSession, Collection, ObjectId } from 'mongodb';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { INVITATIONS_COLLECTION_NAME, type InvitationDocument } from './Invitation.ts';

export type InvitationSummary = Pick<
	InvitationDocument,
	'_id' | 'email' | 'createdAt' | 'expiresAt' | 'revokedAt' | 'redeemedAt'
>;

export class InvitationRepository {
	private collection(): Collection<InvitationDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<InvitationDocument>(INVITATIONS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.collection().createIndexes([
			{ key: { tokenHash: 1 }, unique: true },
			{ key: { createdAt: -1 } }
		]);
	}

	async insert(invitation: Omit<InvitationDocument, '_id'>): Promise<void> {
		await this.collection().insertOne(invitation as InvitationDocument);
	}

	async findRecent(limit: number): Promise<InvitationSummary[]> {
		return this.collection()
			.find(
				{},
				{
					projection: { email: 1, createdAt: 1, expiresAt: 1, revokedAt: 1, redeemedAt: 1 },
					sort: { createdAt: -1 },
					limit
				}
			)
			.toArray();
	}

	async findByTokenHash(
		tokenHash: string,
		session?: ClientSession
	): Promise<Pick<
		InvitationDocument,
		'_id' | 'email' | 'expiresAt' | 'revokedAt' | 'redeemedAt'
	> | null> {
		return this.collection().findOne(
			{ tokenHash },
			{ projection: { email: 1, expiresAt: 1, revokedAt: 1, redeemedAt: 1 }, session }
		);
	}

	/**
	 * Atomically marks a pending invitation as redeemed when its email is one of `verifiedEmails`.
	 * Returns the claimed invitation, or null when nothing matched.
	 */
	async claim(
		tokenHash: string,
		verifiedEmails: string[],
		clerkUserId: string,
		now: Date,
		session: ClientSession
	): Promise<Pick<InvitationDocument, '_id'> | null> {
		return this.collection().findOneAndUpdate(
			{
				tokenHash,
				email: { $in: verifiedEmails },
				redeemedAt: null,
				revokedAt: null,
				expiresAt: { $gt: now }
			},
			{ $set: { redeemedAt: now, redeemedByClerkUserId: clerkUserId } },
			{ projection: { _id: 1 }, session }
		);
	}

	/** Revokes the invitation if it is still unused; returns whether it was revoked. */
	async revoke(invitationId: ObjectId, now: Date): Promise<boolean> {
		const result = await this.collection().updateOne(
			{ _id: invitationId, redeemedAt: null, revokedAt: null },
			{ $set: { revokedAt: now } }
		);
		return result.modifiedCount === 1;
	}
}

export const invitationRepository = new InvitationRepository();
