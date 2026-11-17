import { createHotkeyAttachment } from '@tanstack/svelte-hotkeys';
import type { Attachment } from 'svelte/attachments';
import { KEYBOARD_SHORTCUTS } from './KeyboardShortcuts.ts';

/** Submits the form with the writing shortcut while focus is inside it, as its submit button would. */
export const submitFormOnShortcut: Attachment<HTMLFormElement> = (form) =>
	createHotkeyAttachment(KEYBOARD_SHORTCUTS['writing.submit'], () => form.requestSubmit())(form);
