<script lang="ts">
	import {
		createHotkey,
		getAppHotkeyList,
		getAppHotkeys,
		getFormatForDisplay,
		getHotkeyScopesState
	} from '@tanstack/svelte-hotkeys';
	import type { Hotkey } from '@tanstack/svelte-hotkeys';
	import { m } from '#lib/paraglide/messages.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import {
		KEYBOARD_SHORTCUTS,
		KEYBOARD_SHORTCUT_SECTIONS,
		KEYBOARD_SHORTCUT_SECTION_LABELS
	} from '#lib/client/hotkeys/KeyboardShortcuts.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const formatForDisplay = getFormatForDisplay();
	const shortcutList = getAppHotkeyList();
	const sections = $derived(
		KEYBOARD_SHORTCUT_SECTIONS.map((section) => ({
			section,
			shortcuts: shortcutList.current.filter(
				({ appHotkey }) => appHotkey.hotkey && (appHotkey.meta?.section ?? 'general') === section
			)
		})).filter(({ shortcuts }) => shortcuts.length > 0)
	);

	const appHotkeys = getAppHotkeys();
	const hotkeyScopes = getHotkeyScopesState();
	const toggleHotkey = $derived(appHotkeys.current['shortcuts.toggle'].hotkey);

	// One registration both ways, so holding the keys doesn't reopen or close it again. It never
	// opens over another dialog, which owns the keyboard while it's open.
	createHotkey(
		KEYBOARD_SHORTCUTS['shortcuts.toggle'],
		() => (open = !open),
		() => ({ enabled: open || hotkeyScopes.state.exclusive === null })
	);

	// Opened from the keyboard, there is no trigger for Bits UI to return focus to.
	let returnFocusTo: HTMLElement | null = null;
	$effect.pre(() => {
		if (open && document.activeElement instanceof HTMLElement) {
			returnFocusTo = document.activeElement;
		}
	});

	function restoreFocus(event: Event) {
		if (!returnFocusTo?.isConnected) return;
		event.preventDefault();
		returnFocusTo.focus();
	}

	function describeKeys(hotkey: Hotkey): string {
		return formatForDisplay(hotkey, { useSymbols: false });
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		onCloseAutoFocus={restoreFocus}
		class="max-h-[90dvh] overflow-y-auto tablet:max-w-md"
	>
		<Dialog.Header class="pr-10">
			<Dialog.Title>{m.keyboard_shortcuts_title()}</Dialog.Title>
			{#if toggleHotkey}
				<Dialog.Description class="text-sm text-on-surface-variant">
					{m.keyboard_shortcuts_description({ keys: describeKeys(toggleHotkey) })}
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		{#each sections as { section, shortcuts } (section)}
			<section aria-labelledby="keyboard-shortcuts-{section}">
				<h3 id="keyboard-shortcuts-{section}" class="text-overline text-on-surface-variant">
					{KEYBOARD_SHORTCUT_SECTION_LABELS[section]()}
				</h3>
				<dl class="mt-1 divide-y">
					{#each shortcuts as { appHotkey } (appHotkey.id)}
						{@const hotkey = appHotkey.hotkey!}
						<div class="flex min-h-11 items-center justify-between gap-4 py-2">
							<dt>{appHotkey.meta?.label?.() ?? appHotkey.meta?.name ?? appHotkey.id}</dt>
							<dd class="flex shrink-0 gap-1">
								<span class="sr-only">{describeKeys(hotkey)}</span>
								{#each formatForDisplay(hotkey, { parts: true }) as part, index (index)}
									<kbd
										aria-hidden="true"
										class="inline-flex min-w-7 items-center justify-center rounded-sm border border-b-2 bg-surface-container px-1.5 py-0.5 font-mono text-sm"
										>{part}</kbd
									>
								{/each}
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	</Dialog.Content>
</Dialog.Root>
