/** The item `offset` steps from the current one, wrapping around; the first or last without one. */
export function findNeighbor<T>(items: readonly T[], currentIndex: number, offset: 1 | -1): T {
	if (currentIndex === -1) return items[offset === 1 ? 0 : items.length - 1];
	return items[(currentIndex + offset + items.length) % items.length];
}
