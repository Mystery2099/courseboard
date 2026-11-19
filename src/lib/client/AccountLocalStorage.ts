const STORAGE_KEY_PREFIX = 'courseboard:account:';

function resolveBrowserStorage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/**
 * JSON values in the browser's local storage, kept under the account they belong to. Storage can
 * be missing, full, or blocked, so every call swallows the failure and callers keep working from
 * memory.
 */
export class AccountLocalStorage {
	constructor(private readonly resolveStorage: () => Storage | null = resolveBrowserStorage) {}

	read(accountId: string, key: string): unknown {
		return this.attempt(null, (storage) =>
			this.parse(storage.getItem(this.storageKey(accountId, key)))
		);
	}

	/** Every value whose key starts with the prefix. */
	readAll(accountId: string, keyPrefix: string): unknown[] {
		return this.attempt([], (storage) => {
			const storageKeyPrefix = this.storageKey(accountId, keyPrefix);
			return this.listStorageKeys(storage)
				.filter((storageKey) => storageKey.startsWith(storageKeyPrefix))
				.map((storageKey) => this.parse(storage.getItem(storageKey)))
				.filter((value) => value !== null);
		});
	}

	write(accountId: string, key: string, value: unknown): void {
		this.attempt(undefined, (storage) =>
			storage.setItem(this.storageKey(accountId, key), JSON.stringify(value))
		);
	}

	remove(accountId: string, key: string): void {
		this.attempt(undefined, (storage) => storage.removeItem(this.storageKey(accountId, key)));
	}

	/** Removes every account's values except the given one's; null removes them all. */
	removeAllExcept(accountId: string | null): void {
		this.attempt(undefined, (storage) => {
			const keptPrefix = accountId === null ? null : this.storageKey(accountId, '');
			for (const storageKey of this.listStorageKeys(storage)) {
				if (!storageKey.startsWith(STORAGE_KEY_PREFIX)) continue;
				if (keptPrefix !== null && storageKey.startsWith(keptPrefix)) continue;
				storage.removeItem(storageKey);
			}
		});
	}

	private storageKey(accountId: string, key: string): string {
		return `${STORAGE_KEY_PREFIX}${accountId}:${key}`;
	}

	private listStorageKeys(storage: Storage): string[] {
		return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
			(storageKey) => storageKey !== null
		);
	}

	private parse(serializedValue: string | null): unknown {
		if (serializedValue === null) return null;
		try {
			return JSON.parse(serializedValue);
		} catch {
			return null;
		}
	}

	private attempt<T>(fallback: T, operation: (storage: Storage) => T): T {
		try {
			const storage = this.resolveStorage();
			return storage ? operation(storage) : fallback;
		} catch {
			return fallback;
		}
	}
}
