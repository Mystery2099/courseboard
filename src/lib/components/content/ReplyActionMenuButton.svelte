<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import Ellipsis from 'lucide-svelte/icons/ellipsis';
	import { ChosenReplyAction, type ReplyAction } from '#lib/client/content/ReplyAction.ts';

	let {
		label,
		actions,
		onOpenSheet
	}: {
		label: string;
		actions: ReplyAction[];
		onOpenSheet: (opener: HTMLElement) => void;
	} = $props();

	const chosenAction = new ChosenReplyAction();
</script>

<!-- The visible way into the same actions a long press opens. Phones get the sheet; desktop a dropdown. -->
<Button
	variant="ghost"
	size="icon"
	class="desktop:hidden"
	aria-label={label}
	aria-haspopup="dialog"
	onclick={(event) => onOpenSheet(event.currentTarget)}><Ellipsis size={20} /></Button
>
<div class="hidden desktop:block">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="desktop:size-9" aria-label={label}
					><Ellipsis size={20} /></Button
				>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content
			align="end"
			onCloseAutoFocus={(event) => chosenAction.handleCloseAutoFocus(event)}
		>
			{#each actions as action (action.id)}
				<DropdownMenu.Item disabled={action.disabled} onSelect={() => chosenAction.choose(action)}>
					<action.icon aria-hidden="true" />
					{action.label}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
