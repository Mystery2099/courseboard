import { createHotkeysAttachment } from '@tanstack/svelte-hotkeys';
import type { Attachment } from 'svelte/attachments';
import {
	MarkdownInlineFormatter,
	type MarkdownInlineStyle,
	type MarkdownTextEdit
} from '#lib/client/content/MarkdownInlineFormatter.ts';
import { KEYBOARD_SHORTCUTS } from './KeyboardShortcuts.ts';

/** Toggles bold, italic, and inline code on the selection in a Markdown field. */
export const formatMarkdownOnShortcut: Attachment<HTMLTextAreaElement> = (field) =>
	createHotkeysAttachment([
		{ hotkey: KEYBOARD_SHORTCUTS['writing.bold'], callback: () => toggleStyle(field, 'bold') },
		{ hotkey: KEYBOARD_SHORTCUTS['writing.italic'], callback: () => toggleStyle(field, 'italic') },
		{ hotkey: KEYBOARD_SHORTCUTS['writing.code'], callback: () => toggleStyle(field, 'code') }
	])(field);

function toggleStyle(field: HTMLTextAreaElement, style: MarkdownInlineStyle) {
	const edit = MarkdownInlineFormatter.toggle(
		field.value,
		field.selectionStart,
		field.selectionEnd,
		style
	);
	if (edit) applyEdit(field, edit);
}

function applyEdit(field: HTMLTextAreaElement, edit: MarkdownTextEdit) {
	// Chrome cuts inserted text at maxlength instead of refusing it, which would lose selected text.
	const resultLength =
		field.value.length - (edit.replaceEnd - edit.replaceStart) + edit.insertedText.length;
	if (field.maxLength >= 0 && resultLength > field.maxLength) return;

	field.setSelectionRange(edit.replaceStart, edit.replaceEnd);
	// The editing command keeps the change on the field's undo stack; setRangeText would clear it.
	const isEdited = edit.insertedText
		? document.execCommand('insertText', false, edit.insertedText)
		: document.execCommand('delete');
	if (!isEdited) {
		field.setRangeText(edit.insertedText);
		field.dispatchEvent(new InputEvent('input', { bubbles: true }));
	}
	field.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}
