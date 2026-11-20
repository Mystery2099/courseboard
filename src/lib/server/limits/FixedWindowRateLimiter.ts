/**
 * Counts uses per key in fixed time windows, in this process's memory. Render runs one instance, so
 * one process sees every request. Counts reset on restart, which only loosens a limit briefly.
 */
export class FixedWindowRateLimiter {
	/** Expired windows are swept once this many keys are held, so memory stays bounded. */
	private static readonly SWEEP_THRESHOLD = 10_000;
	private readonly windows = new Map<string, { startedAt: number; count: number }>();

	constructor(
		private readonly maximumPerWindow: number,
		private readonly windowMilliseconds: number,
		private readonly now: () => number = Date.now
	) {}

	/** Counts one use of `key` and returns true, or returns false when its window is full. */
	tryAcquire(key: string): boolean {
		const now = this.now();
		const currentWindow = this.windows.get(key);
		if (!currentWindow || now - currentWindow.startedAt >= this.windowMilliseconds) {
			if (this.windows.size >= FixedWindowRateLimiter.SWEEP_THRESHOLD) this.sweepExpired(now);
			this.windows.set(key, { startedAt: now, count: 1 });
			return true;
		}
		if (currentWindow.count >= this.maximumPerWindow) return false;
		currentWindow.count += 1;
		return true;
	}

	/** Whether `key` has a use left in its current window, without counting one. */
	hasCapacity(key: string): boolean {
		const currentWindow = this.windows.get(key);
		return (
			!currentWindow ||
			this.now() - currentWindow.startedAt >= this.windowMilliseconds ||
			currentWindow.count < this.maximumPerWindow
		);
	}

	private sweepExpired(now: number): void {
		for (const [key, currentWindow] of this.windows) {
			if (now - currentWindow.startedAt >= this.windowMilliseconds) this.windows.delete(key);
		}
	}
}
