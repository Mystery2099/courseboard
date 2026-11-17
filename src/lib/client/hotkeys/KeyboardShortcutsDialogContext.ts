import { createContext } from 'svelte';

/** Opens the shortcuts dialog the app layout owns, for controls that list the shortcuts. */
export interface KeyboardShortcutsDialogOpener {
	open(): void;
}

export const [getKeyboardShortcutsDialogOpener, setKeyboardShortcutsDialogOpener] =
	createContext<KeyboardShortcutsDialogOpener>();
