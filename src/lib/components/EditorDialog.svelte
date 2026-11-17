<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from 'lucide-svelte/icons/x';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';

	interface Props {
		open?: boolean;
		title: string;
		description: string;
		/** The id of the form inside, so the header's submit button can submit it on phones. */
		formId: string;
		submitLabel: string;
		isSubmitting?: boolean;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		formId,
		submitLabel,
		isSubmitting = false,
		children
	}: Props = $props();

	// These dialogs open from ordinary buttons rather than a Dialog.Trigger, so Bits UI has nothing
	// to return focus to. Remember what had focus when the dialog opened and go back there.
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
</script>

<!--
	Full screen on phones, with close, title, and the primary action in a header that stays put
	(the design's mobile editor). A centered dialog from tablet up, where the form's own buttons
	are shown instead.
-->
<Dialog.Root bind:open>
	<Dialog.Content
		showCloseButton={false}
		onCloseAutoFocus={restoreFocus}
		class="inset-0 block max-h-dvh max-w-none translate-0 overflow-y-auto rounded-none p-0 shadow-none ring-0 tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-[90dvh] tablet:w-[36rem] tablet:max-w-[calc(100%-2rem)] tablet:-translate-1/2 tablet:rounded-sheet tablet:shadow-dialog tablet:ring-1"
	>
		<div
			class="sticky top-0 z-10 flex items-center gap-2 border-b bg-surface px-2 py-2 tablet:static tablet:border-0 tablet:px-4 tablet:pt-5 tablet:pb-0"
		>
			<Dialog.Close
				class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				aria-label={m.common_close()}><X size={22} /></Dialog.Close
			>
			<Dialog.Title class="min-w-0 flex-1 truncate">{title}</Dialog.Title>
			<Button
				type="submit"
				form={formId}
				size="compact"
				class="tablet:hidden"
				disabled={isSubmitting}>{submitLabel}</Button
			>
		</div>
		<Dialog.Description class="sr-only">{description}</Dialog.Description>
		<div class="p-4 tablet:px-6 tablet:pb-6">
			{@render children()}
		</div>
	</Dialog.Content>
</Dialog.Root>
