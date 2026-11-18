import { defineAppHotkeys } from '@tanstack/svelte-hotkeys';
import { m } from '#lib/paraglide/messages.js';

/** The sections of the shortcuts dialog, in display order. */
export const KEYBOARD_SHORTCUT_SECTIONS = ['general', 'navigation', 'writing'] as const;

export type KeyboardShortcutSection = (typeof KEYBOARD_SHORTCUT_SECTIONS)[number];

/** Message functions, so each label is read in the locale of the current request. */
export const KEYBOARD_SHORTCUT_SECTION_LABELS: Record<KeyboardShortcutSection, () => string> = {
	general: m.keyboard_shortcuts_section_general,
	navigation: m.keyboard_shortcuts_section_navigation,
	writing: m.keyboard_shortcuts_section_writing
};

/** The scope of shortcuts that act on the page, which every open dialog or sheet turns off. */
export const PAGE_SHORTCUT_SCOPE = 'page';

declare module '@tanstack/svelte-hotkeys' {
	interface Register {
		appHotkeys: typeof KEYBOARD_SHORTCUTS;
	}

	interface HotkeyMeta {
		/** The translated label shown in the shortcuts dialog. */
		label?: () => string;
		section?: KeyboardShortcutSection;
	}
}

/**
 * Every keyboard shortcut in the app, listed in this order in the shortcuts dialog. To add one,
 * declare it here and register it with `createHotkey` or `createHotkeyAttachment` in the
 * component that owns its action. `name` is the English label developer tools show.
 *
 * Ids are a storage contract for custom shortcuts, so don't rename them. Every shortcut uses a
 * modifier: single-character shortcuts would need a setting to turn them off (WCAG 2.1.4).
 */
export const KEYBOARD_SHORTCUTS = defineAppHotkeys({
	'shortcuts.toggle': {
		hotkey: 'Mod+/',
		meta: {
			name: 'Show keyboard shortcuts',
			section: 'general',
			label: m.keyboard_shortcut_toggle_list
		},
		options: { requireReset: true }
	},
	'navigation.search': {
		hotkey: 'Mod+K',
		meta: { name: 'Search', section: 'navigation', label: m.keyboard_shortcut_search },
		// Off while typing, so leaving the page can't throw away an unsent reply.
		options: { ignoreInputs: true }
	},
	'navigation.previousCourse': {
		hotkey: 'Alt+Shift+ArrowUp',
		meta: {
			name: 'Previous followed course',
			section: 'navigation',
			label: m.keyboard_shortcut_previous_course
		}
	},
	'navigation.nextCourse': {
		hotkey: 'Alt+Shift+ArrowDown',
		meta: {
			name: 'Next followed course',
			section: 'navigation',
			label: m.keyboard_shortcut_next_course
		}
	},
	'navigation.previousChannel': {
		hotkey: 'Alt+ArrowUp',
		meta: {
			name: 'Previous channel',
			section: 'navigation',
			label: m.keyboard_shortcut_previous_channel
		}
	},
	'navigation.nextChannel': {
		hotkey: 'Alt+ArrowDown',
		meta: { name: 'Next channel', section: 'navigation', label: m.keyboard_shortcut_next_channel }
	},
	'writing.submit': {
		hotkey: 'Mod+Enter',
		meta: { name: 'Send or post', section: 'writing', label: m.keyboard_shortcut_submit },
		// Forms register it from outside their dialog's scope; it only listens on the form anyway.
		scope: 'global',
		options: { requireReset: true }
	},
	// The formatting shortcuts listen only on Markdown fields, which can sit inside dialogs.
	'writing.bold': {
		hotkey: 'Mod+B',
		meta: { name: 'Bold', section: 'writing', label: m.keyboard_shortcut_bold },
		scope: 'global'
	},
	'writing.italic': {
		hotkey: 'Mod+I',
		meta: { name: 'Italic', section: 'writing', label: m.keyboard_shortcut_italic },
		scope: 'global'
	},
	'writing.strikethrough': {
		hotkey: 'Mod+Shift+X',
		meta: { name: 'Strikethrough', section: 'writing', label: m.keyboard_shortcut_strikethrough },
		scope: 'global'
	},
	'writing.code': {
		hotkey: 'Mod+E',
		meta: { name: 'Inline code', section: 'writing', label: m.keyboard_shortcut_code },
		scope: 'global'
	}
});
