<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { m } from '#lib/paraglide/messages.js';
	import { MentionApiClient, mentionQueryKeys } from '#lib/client/content/MentionApiClient.ts';
	import { MentionCompletion, type MentionQuery } from '#lib/client/content/MentionCompletion.ts';
	import { applyMarkdownTextEdit } from '#lib/client/hotkeys/MarkdownFormattingShortcuts.ts';

	const TYPING_PAUSE_MILLISECONDS = 150;

	let {
		field,
		placement = 'below'
	}: {
		/** The Markdown field to complete `@` mentions in. */
		field: HTMLTextAreaElement | null;
		/** Above suits a field pinned to the bottom of the screen. */
		placement?: 'above' | 'below';
	} = $props();

	const listId = $props.id();
	let mentionQuery = $state<MentionQuery | null>(null);
	let requestedPrefix = $state('');
	let activeIndex = $state(0);
	/** The `@` that Escape closed, so the list stays closed until another mention is started. */
	let dismissedStart: number | null = null;

	const suggestionsQuery = createQuery(() => ({
		queryKey: mentionQueryKeys.suggestions(requestedPrefix),
		queryFn: () => MentionApiClient.suggestPeople(requestedPrefix),
		enabled: requestedPrefix.length > 0,
		staleTime: 60_000
	}));
	const suggestions = $derived(
		mentionQuery && requestedPrefix === mentionQuery.prefix ? (suggestionsQuery.data ?? []) : []
	);
	const isOpen = $derived(suggestions.length > 0);
	const highlightedIndex = $derived(Math.min(activeIndex, suggestions.length - 1));
	const optionId = (index: number) => `${listId}-option-${index}`;

	// Waits for a pause in typing before asking the server.
	$effect(() => {
		const prefix = mentionQuery?.prefix ?? '';
		const timer = setTimeout(() => (requestedPrefix = prefix), TYPING_PAUSE_MILLISECONDS);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!field) return;
		field.setAttribute('aria-autocomplete', 'list');
		if (isOpen) {
			field.setAttribute('aria-controls', listId);
			field.setAttribute('aria-activedescendant', optionId(highlightedIndex));
			// Focus stays in the field, so the browser won't scroll the highlighted option itself.
			document.getElementById(optionId(highlightedIndex))?.scrollIntoView({ block: 'nearest' });
		} else {
			field.removeAttribute('aria-controls');
			field.removeAttribute('aria-activedescendant');
		}
	});

	$effect(() => {
		const textField = field;
		if (!textField) return;
		const findQuery = () => {
			const query =
				textField.selectionStart === textField.selectionEnd
					? MentionCompletion.findQuery(textField.value, textField.selectionStart)
					: null;
			if (query?.start !== dismissedStart) dismissedStart = null;
			const nextQuery = query && query.start !== dismissedStart ? query : null;
			// Moving the caret within the same mention keeps the highlighted person.
			if (nextQuery?.start === mentionQuery?.start && nextQuery?.prefix === mentionQuery?.prefix) {
				return;
			}
			mentionQuery = nextQuery;
			activeIndex = 0;
		};
		const close = () => (mentionQuery = null);
		const handleKeydown = (event: KeyboardEvent) => {
			if (!isOpen || event.isComposing) return;
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				const step = event.key === 'ArrowDown' ? 1 : -1;
				activeIndex = (highlightedIndex + step + suggestions.length) % suggestions.length;
			} else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
				event.preventDefault();
				event.stopPropagation();
				insert(suggestions[highlightedIndex].username);
			} else if (event.key === 'Escape') {
				// Closes only the list, not a dialog the field sits in.
				event.preventDefault();
				event.stopPropagation();
				dismissedStart = mentionQuery?.start ?? null;
				close();
			} else if (event.key === 'Tab') {
				close();
			}
		};
		textField.addEventListener('input', findQuery);
		textField.addEventListener('click', findQuery);
		textField.addEventListener('keyup', findQuery);
		textField.addEventListener('keydown', handleKeydown);
		textField.addEventListener('blur', close);
		return () => {
			textField.removeEventListener('input', findQuery);
			textField.removeEventListener('click', findQuery);
			textField.removeEventListener('keyup', findQuery);
			textField.removeEventListener('keydown', handleKeydown);
			textField.removeEventListener('blur', close);
		};
	});

	function insert(username: string) {
		// The field's text can change under an open list, such as when the reply bar switches drafts.
		const typedQuery = field
			? MentionCompletion.findQuery(field.value, field.selectionStart)
			: null;
		if (
			field &&
			typedQuery &&
			typedQuery.start === mentionQuery?.start &&
			typedQuery?.prefix === mentionQuery?.prefix
		) {
			applyMarkdownTextEdit(field, MentionCompletion.complete(typedQuery, username));
		}
		mentionQuery = null;
	}
</script>

<p class="sr-only" aria-live="polite">
	{isOpen ? m.mention_suggestions_available({ count: suggestions.length }) : ''}
</p>
{#if isOpen}
	<ul
		id={listId}
		role="listbox"
		aria-label={m.mention_suggestions_label()}
		class={[
			'absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-2xl border bg-surface py-1 shadow-floating',
			placement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
		]}
	>
		{#each suggestions as person, index (person.username)}
			<!-- The field keeps focus and handles the keyboard; a pointer picks directly. -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<li
				id={optionId(index)}
				role="option"
				aria-selected={index === highlightedIndex}
				class={[
					'flex min-h-11 cursor-pointer items-baseline gap-2 px-4 py-2',
					index === highlightedIndex && 'bg-secondary-container text-on-secondary-container'
				]}
				onpointerdown={(event) => event.preventDefault()}
				onclick={() => insert(person.username)}
			>
				<span class="truncate font-semibold">{person.displayName}</span>
				<span class="shrink-0 text-sm text-on-surface-variant">@{person.username}</span>
			</li>
		{/each}
	</ul>
{/if}
