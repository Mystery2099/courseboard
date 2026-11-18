import { createContext } from 'svelte';
import type { RealtimeConnection } from './RealtimeConnection.svelte.ts';

/** Reads the signed-in layout's connection, which is null until the Clerk session has loaded. */
export type RealtimeConnectionAccessor = () => RealtimeConnection | null;

export const [getRealtimeConnectionAccessor, setRealtimeConnectionAccessor] =
	createContext<RealtimeConnectionAccessor>();
