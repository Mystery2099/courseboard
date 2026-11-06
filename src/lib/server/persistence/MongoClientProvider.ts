import { MongoClient, type ClientSession, type Db } from 'mongodb';
import { MONGODB_DATABASE_NAME, MONGODB_URI } from '$app/env/private';

/**
 * Owns the single MongoClient for this process. The driver pools connections internally,
 * so every repository should obtain its database through this provider.
 *
 * Startup never blocks on MongoDB: `initialize()` begins connecting in the background. A client
 * whose initial connection fails cannot recover, so it is discarded and the next database access
 * creates a new one. While the cluster is unreachable, operations fail after the server selection
 * timeout and `/api/health` reports 503; once it is reachable again, the process recovers
 * without a restart.
 */
class MongoClientProvider {
	private client: MongoClient | null = null;

	initialize(): void {
		this.getOrCreateClient();
	}

	getDatabase(): Db {
		return this.getOrCreateClient().db(MONGODB_DATABASE_NAME);
	}

	/** Starts a session for a multi-document transaction; Atlas clusters support them. */
	startSession(): ClientSession {
		return this.getOrCreateClient().startSession();
	}

	private getOrCreateClient(): MongoClient {
		if (this.client) return this.client;
		const client = new MongoClient(MONGODB_URI, {
			appName: 'academic-discussion-platform',
			// Fail fast so unreachable-cluster errors surface quickly instead of hanging requests.
			serverSelectionTimeoutMS: 5000
		});
		this.client = client;
		client.connect().catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			console.error(`MongoDB is not reachable; will retry on the next access: ${reason}`);
			if (this.client === client) this.client = null;
			void client.close().catch(() => undefined);
		});
		return client;
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
