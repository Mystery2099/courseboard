import { describe, expect, it } from 'vitest';
import { normalizeHotkey, parseHotkey, type HotkeyChord } from '@tanstack/svelte-hotkeys';
import { KEYBOARD_SHORTCUTS, KEYBOARD_SHORTCUT_SECTIONS } from './KeyboardShortcuts.ts';

const shortcuts = Object.values(KEYBOARD_SHORTCUTS);

describe('KeyboardShortcuts', () => {
	it('gives every shortcut a modifier, a translated label, and a section', () => {
		for (const shortcut of shortcuts) {
			expect(parseHotkey(shortcut.hotkey as HotkeyChord).modifiers, shortcut.id).not.toEqual([]);
			expect(shortcut.meta?.label?.(), shortcut.id).toBeTruthy();
			expect(KEYBOARD_SHORTCUT_SECTIONS, shortcut.id).toContain(shortcut.meta?.section);
		}
	});

	it('uses each key combination once', () => {
		const combinations = shortcuts.map((shortcut) =>
			normalizeHotkey(shortcut.hotkey as HotkeyChord, 'linux')
		);

		expect(new Set(combinations).size).toBe(combinations.length);
	});
});
