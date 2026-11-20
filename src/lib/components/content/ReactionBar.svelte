<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { m } from '#lib/paraglide/messages.js';
	import SmilePlus from 'lucide-svelte/icons/smile-plus';
	import {
		REACTION_EMOJIS,
		type ReactionCountResponse,
		type ReactionEmoji
	} from '#lib/contracts/ReactionContract.ts';
	import { REACTION_GLYPHS, REACTION_NAMES } from '#lib/client/content/ReactionPresentation.ts';

	let {
		reactions,
		onToggle
	}: {
		reactions: ReactionCountResponse[];
		onToggle: (emoji: ReactionEmoji, isAdding: boolean) => void;
	} = $props();

	let addButton = $state<HTMLElement | null>(null);

	/** Removing the last of an emoji removes its chip, so focus moves to the add button instead. */
	function toggleFromChip(reaction: ReactionCountResponse) {
		const removesChip = reaction.reactedByViewer && reaction.count === 1;
		onToggle(reaction.emoji, !reaction.reactedByViewer);
		if (removesChip) addButton?.focus();
	}

	const hasReacted = (emoji: ReactionEmoji) =>
		reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByViewer);
</script>

<!-- Counts only acknowledge; nothing sorts or ranks by them. -->
<div class="flex flex-wrap items-center gap-1.5">
	{#each reactions as reaction (reaction.emoji)}
		<button
			type="button"
			aria-pressed={reaction.reactedByViewer}
			aria-label={m.reaction_count_label({
				name: REACTION_NAMES[reaction.emoji](),
				count: reaction.count
			})}
			class={[
				'inline-flex min-h-11 items-center gap-1 rounded-full border state-layer-primary px-3 text-sm transition-colors duration-150 desktop:min-h-8 desktop:px-2.5',
				reaction.reactedByViewer
					? 'border-primary bg-primary-container text-on-primary-container'
					: 'border-outline-variant text-on-surface-variant'
			]}
			onclick={() => toggleFromChip(reaction)}
		>
			<span aria-hidden="true">{REACTION_GLYPHS[reaction.emoji]}</span>
			<span class="font-semibold tabular-nums">{reaction.count}</span>
		</button>
	{/each}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					bind:ref={addButton}
					variant="ghost"
					size="icon"
					class="desktop:size-8"
					aria-label={m.reaction_add()}><SmilePlus size={18} /></Button
				>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="flex w-auto min-w-0 gap-0.5 p-1" collisionPadding={16}>
			{#each REACTION_EMOJIS as emoji (emoji)}
				{@const isReacted = hasReacted(emoji)}
				<!-- A checkbox item, so the picker says which reactions are already yours. -->
				<DropdownMenuPrimitive.CheckboxItem
					checked={isReacted}
					closeOnSelect
					aria-label={REACTION_NAMES[emoji]()}
					class={[
						'flex size-11 cursor-default items-center justify-center rounded-xl text-xl outline-hidden select-none focus:bg-accent desktop:size-9',
						isReacted && 'bg-primary-container'
					]}
					onCheckedChange={(checked) => onToggle(emoji, checked)}
					><span aria-hidden="true">{REACTION_GLYPHS[emoji]}</span
					></DropdownMenuPrimitive.CheckboxItem
				>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
