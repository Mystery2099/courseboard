<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { SignOutButton, useClerkContext } from 'svelte-clerk';
	import LanguagePicker from '#lib/components/LanguagePicker.svelte';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let isEditingDisplayName = $state(false);
	let displayNameInput = $state<HTMLInputElement | null>(null);
	let editDisplayNameButton = $state<HTMLButtonElement | null>(null);

	// The control that started or ended editing disappears, so focus moves to its replacement.
	async function startEditingDisplayName() {
		isEditingDisplayName = true;
		await tick();
		displayNameInput?.focus();
	}

	async function stopEditingDisplayName() {
		isEditingDisplayName = false;
		await tick();
		editDisplayNameButton?.focus();
	}
	let isSaving = $state(false);
	let isSavingInstitutionVisibility = $state(false);

	// Email, password, and photo are Clerk's; its account manager opens over the page.
	const clerkContext = useClerkContext();
	function openAccountManager() {
		const clerk = clerkContext.clerk;
		if (clerk && 'openUserProfile' in clerk) clerk.openUserProfile();
	}

	// Rows sit in a rounded, clipped list, so their focus ring is drawn inside the row.
	const ROW = 'flex min-h-16 items-center justify-between gap-4 px-4 py-3';
	const ROW_BUTTON = `${ROW} w-full text-left transition-colors duration-150 hover:bg-on-surface/8 focus-visible:-outline-offset-2 disabled:cursor-wait disabled:opacity-60`;
</script>

<svelte:head><title>{m.settings_title()}</title></svelte:head>

<!-- Grouped rows under section labels, as in the Settings design. -->
<main class="mx-auto max-w-2xl px-4 py-6 desktop:py-10">
	<div class="flex items-center gap-2">
		<Button
			variant="ghost"
			size="icon"
			class="-ml-3"
			href={resolve('/(app)/profile')}
			aria-label={m.settings_back_to_profile()}><ChevronLeft size={24} /></Button
		>
		<h1 class="text-headline font-bold">{m.settings_title()}</h1>
	</div>

	<section class="mt-6" aria-labelledby="settings-account">
		<h2 id="settings-account" class="px-1 text-overline text-on-surface-variant">
			{m.settings_group_account()}
		</h2>
		<ul class="mt-2 divide-y overflow-hidden rounded-card border bg-surface">
			<li class="@container px-4 py-3">
				{#if isEditingDisplayName}
					<form
						method="POST"
						action="?/updateDisplayName"
						class="flex flex-col gap-3 @md:flex-row @md:items-end"
						use:enhance={() => {
							isSaving = true;
							return async ({ result, update }) => {
								await update({ reset: false });
								isSaving = false;
								if (result.type === 'success') {
									await stopEditingDisplayName();
								} else {
									await tick();
									displayNameInput?.focus();
								}
							};
						}}
					>
						<label class="flex min-w-0 flex-1 flex-col gap-1.5">
							<span class="font-semibold">{m.profile_display_name()}</span>
							<input
								bind:this={displayNameInput}
								name="displayName"
								value={form?.displayName ?? data.profile.displayName}
								maxlength="50"
								autocomplete="name"
								required
								aria-invalid={form?.displayNameError ? 'true' : undefined}
								aria-describedby={form?.displayNameError ? 'display-name-error' : undefined}
								class="min-h-12 w-full rounded-field px-4 text-base"
							/>
						</label>
						<div class="flex gap-2">
							<Button variant="filled" type="submit" disabled={isSaving}>{m.common_save()}</Button>
							<Button variant="outlined" onclick={stopEditingDisplayName}
								>{m.common_cancel()}</Button
							>
						</div>
					</form>
					{#if form?.displayNameError}
						<p id="display-name-error" class="mt-2 text-sm text-error" role="alert">
							{describeErrorCode(form.displayNameError)}
						</p>
					{/if}
				{:else}
					<div class="flex min-h-10 items-center justify-between gap-4">
						<div class="min-w-0">
							<p class="font-semibold">{m.profile_display_name()}</p>
							<p class="truncate text-on-surface-variant">{data.profile.displayName}</p>
						</div>
						<Button
							variant="outlined"
							size="compact"
							bind:ref={editDisplayNameButton}
							onclick={startEditingDisplayName}>{m.common_edit()}</Button
						>
					</div>
					{#if form?.displayNameSaved}
						<p class="mt-1 text-sm text-on-surface-variant" role="status">{m.common_saved()}</p>
					{/if}
				{/if}
			</li>
			<li class={ROW}>
				<span class="font-semibold">{m.onboarding_username()}</span>
				<span class="truncate text-on-surface-variant">@{data.profile.username}</span>
			</li>
			<li>
				<button
					type="button"
					class={ROW_BUTTON}
					disabled={!clerkContext.isLoaded}
					onclick={openAccountManager}
				>
					<span class="min-w-0">
						<span class="block font-semibold">{m.settings_manage_account()}</span>
						<span class="block text-sm text-on-surface-variant"
							>{m.settings_manage_account_hint()}</span
						>
					</span>
					<ChevronRight size={20} class="shrink-0 text-on-surface-variant" aria-hidden="true" />
				</button>
			</li>
		</ul>
		<p class="mt-2 px-1 text-sm text-on-surface-variant">{m.profile_identity_notice()}</p>
	</section>

	<section class="mt-8" aria-labelledby="settings-academic">
		<h2 id="settings-academic" class="px-1 text-overline text-on-surface-variant">
			{m.settings_group_academic()}
		</h2>
		<ul class="mt-2 divide-y overflow-hidden rounded-card border bg-surface">
			<li class="px-4 py-3">
				<form
					method="POST"
					action="?/updatePrimaryInstitutionVisibility"
					class="flex min-h-10 items-center justify-between gap-4"
					use:enhance={() => {
						isSavingInstitutionVisibility = true;
						return async ({ update }) => {
							await update({ reset: false });
							isSavingInstitutionVisibility = false;
						};
					}}
				>
					<div class="min-w-0">
						<p class="font-semibold">{m.profile_school()}</p>
						<p class="text-on-surface-variant">{data.profile.primaryInstitution.name}</p>
						<p class="text-sm text-on-surface-variant">
							{data.profile.isPrimaryInstitutionHidden
								? m.profile_school_hidden()
								: m.profile_school_shown()}
						</p>
					</div>
					<Button
						variant="outlined"
						size="compact"
						class="shrink-0"
						type="submit"
						name="isPrimaryInstitutionHidden"
						value={data.profile.isPrimaryInstitutionHidden ? 'false' : 'true'}
						disabled={isSavingInstitutionVisibility}
						>{data.profile.isPrimaryInstitutionHidden
							? m.profile_school_show()
							: m.profile_school_hide()}</Button
					>
				</form>
				{#if form?.institutionVisibilityError}
					<p class="mt-2 text-sm text-error" role="alert">
						{describeErrorCode(form.institutionVisibilityError)}
					</p>
				{:else if form?.institutionVisibilitySaved}
					<p class="mt-2 text-sm text-on-surface-variant" role="status">{m.common_saved()}</p>
				{/if}
			</li>
		</ul>
		<p class="mt-2 px-1 text-sm text-on-surface-variant">
			{m.profile_school_hiding_explanation()}
		</p>
	</section>

	<section class="mt-8" aria-labelledby="settings-app">
		<h2 id="settings-app" class="px-1 text-overline text-on-surface-variant">
			{m.settings_group_app()}
		</h2>
		<ul class="mt-2 divide-y overflow-hidden rounded-card border bg-surface">
			<li class={ROW}>
				<span class="font-semibold" aria-hidden="true">{m.profile_language()}</span>
				<LanguagePicker isLabelVisible={false} />
			</li>
		</ul>
		<p class="mt-2 px-1 text-sm text-on-surface-variant">{m.profile_language_explanation()}</p>
	</section>

	<ul class="mt-8 overflow-hidden rounded-card border bg-surface">
		<li>
			<SignOutButton class="{ROW_BUTTON} font-semibold"
				>{m.auth_sign_out()}
				<ChevronRight size={20} class="shrink-0 text-on-surface-variant" aria-hidden="true" />
			</SignOutButton>
		</li>
	</ul>
</main>
