import { createHotkeyAttachment } from '@tanstack/svelte-hotkeys';
import type { Attachment } from 'svelte/attachments';
import {
	MarkdownInlineFormatter,
	type MarkdownInlineStyle,
	type MarkdownTextEdit
} from '#lib/client/content/MarkdownInlineFormatter.ts';
import { KEYBOARD_SHORTCUTS } from './KeyboardShortcuts.ts';

const SHORTCUT_STYLES = [
	['writing.bold', 'bold'],
	['writing.italic', 'italic'],
	['writing.strikethrough', 'strikethrough'],
	['writing.code', 'code']
] as const satisfies ReadonlyArray<readonly [keyof typeof KEYBOARD_SHORTCUTS, MarkdownInlineStyle]>;

/** Toggles bold, italic, strikethrough, and code on the selection in a Markdown field. */
export const formatMarkdownOnShortcut: Attachment<HTMLTextAreaElement> = (field) => {
	const cleanups = SHORTCUT_STYLES.map(([shortcutId, style]) =>
		createHotkeyAttachment(KEYBOARD_SHORTCUTS[shortcutId], () => toggleStyle(field, style))(field)
	);
	return () => cleanups.forEach((cleanup) => cleanup?.());
};

function toggleStyle(field: HTMLTextAreaElement, style: MarkdownInlineStyle) {
	applyEdit(
		field,
		MarkdownInlineFormatter.toggle(field.value, field.selectionStart, field.selectionEnd, style)
	);
}

function applyEdit(field: HTMLTextAreaElement, edit: MarkdownTextEdit) {
	// Chrome cuts inserted text at maxlength instead of refusing it, which would lose selected text.
	const resultLength =
		field.value.length - (edit.replaceEnd - edit.replaceStart) + edit.insertedText.length;
	if (field.maxLength >= 0 && resultLength > field.maxLength) return;

	field.setSelectionRange(edit.replaceStart, edit.replaceEnd);
	// The editing command keeps the change on the field's undo stack; setRangeText would clear it.
	const isInserted = edit.insertedText
		? document.execCommand('insertText', false, edit.insertedText)
		: document.execCommand('delete');
	if (!isInserted) {
		field.setRangeText(edit.insertedText);
		field.dispatchEvent(new InputEvent('input', { bubbles: true }));
	}
	field.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}
