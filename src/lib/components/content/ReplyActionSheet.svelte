<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import { flushSync } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { ChosenReplyAction, type ReplyAction } from '#lib/client/content/ReplyAction.ts';

	let {
		isOpen,
		opener,
		title,
		actions,
		onClose
	}: {
		isOpen: boolean;
		/** Gets focus back when the sheet closes, since a tap on a phone may not have focused it. */
		opener: HTMLElement | null;
		title: string;
		actions: ReplyAction[];
		onClose: () => void;
	} = $props();

	const chosenAction = new ChosenReplyAction();
	// Set while the history entry is still being removed, so the sheet doesn't wait for it.
	let isDismissed = $state(false);

	$effect.pre(() => {
		if (isOpen) isDismissed = false;
	});

	function choose(action: ReplyAction) {
		// A second tap while the sheet slides away mustn't run another action.
		if (isDismissed || !isOpen) return;
		chosenAction.choose(action);
		// Closing now releases the focus trap during the tap, so focus moved into the reply field
		// opens the keyboard on iOS too.
		flushSync(() => (isDismissed = true));
		onClose();
	}
</script>

<!-- One sheet serves every reply on the page, so opening another never stacks a second one. -->
<Drawer.Root open={isOpen && !isDismissed} onOpenChange={(open) => !open && onClose()} autoFocus>
	<Drawer.Content onCloseAutoFocus={(event) => chosenAction.handleCloseAutoFocus(event, opener)}>
		<div class="flex items-center justify-between gap-2 px-4 pt-2">
			<Drawer.Title class="truncate">{title}</Drawer.Title>
			<Drawer.Close>
				{#snippet child({ props })}
					<Button {...props} variant="text" size="compact">{m.common_close()}</Button>
				{/snippet}
			</Drawer.Close>
		</div>
		<ul class="mt-2 px-2">
			{#each actions as action (action.id)}
				<li>
					<button
						type="button"
						class="flex min-h-12 w-full items-center gap-3 rounded-2xl navigation-item px-4 text-left text-lg disabled:opacity-50"
						disabled={action.disabled}
						onclick={() => choose(action)}
					>
						<action.icon size={20} aria-hidden="true" />
						{action.label}
					</button>
				</li>
			{/each}
		</ul>
	</Drawer.Content>
</Drawer.Root>
