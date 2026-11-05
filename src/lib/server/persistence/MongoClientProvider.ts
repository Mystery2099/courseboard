import { MongoClient, type Db } from 'mongodb';
import { MONGODB_DATABASE_NAME, MONGODB_URI } from '$app/env/private';

/**
 * Owns the single MongoClient for this process. The driver pools connections internally,
 * so every repository should obtain its database through this provider.
 */
class MongoClientProvider {
	private client: MongoClient | null = null;

	async connect(): Promise<void> {
		if (this.client) return;
		const client = new MongoClient(MONGODB_URI, { appName: 'academic-discussion-platform' });
		await client.connect();
		this.client = client;
	}

	getDatabase(): Db {
		if (!this.client) {
			throw new Error(
				'MongoClientProvider.connect() must complete before getDatabase() is called.'
			);
		}
		return this.client.db(MONGODB_DATABASE_NAME);
	}

	async isReachable(): Promise<boolean> {
		try {
			await this.getDatabase().command({ ping: 1 });
			return true;
		} catch {
			return false;
		}
	}

	async close(): Promise<void> {
		await this.client?.close();
		this.client = null;
	}
}

export const mongoClientProvider = new MongoClientProvider();
