<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { SignOutButton, UserButton, useClerkContext } from 'svelte-clerk';
	import LanguagePicker from '#lib/components/LanguagePicker.svelte';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import AcademicHistorySection from '#lib/components/history/AcademicHistorySection.svelte';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const clerkContext = useClerkContext();
	const imageUrl = $derived(clerkContext.user?.hasImage ? clerkContext.user.imageUrl : null);

	let isEditingDisplayName = $state(false);
	let isSaving = $state(false);
	let isSavingInstitutionVisibility = $state(false);
</script>

<svelte:head><title>{m.profile_title()}</title></svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<div class="flex items-center gap-4">
		<UserAvatar
			username={data.profile.username}
			displayName={data.profile.displayName}
			{imageUrl}
			size={72}
		/>
		<div class="min-w-0">
			<h1 class="truncate text-3xl font-semibold">{data.profile.displayName}</h1>
			<p class="text-on-surface-variant">
				@{data.profile.username} · {data.profile.primaryInstitution.name}
			</p>
		</div>
	</div>

	<AcademicHistorySection
		initialHistory={data.history}
		initialHistoryLoadedAt={data.historyLoadedAt}
		username={data.profile.username}
		primaryInstitutionId={data.profile.primaryInstitution.id}
	/>

	<section class="mt-8 rounded-card border bg-surface p-4">
		<h2 class="text-lg font-semibold">{m.profile_display_name()}</h2>
		{#if isEditingDisplayName}
			<form
				method="POST"
				action="?/updateDisplayName"
				class="mt-3 flex flex-col gap-3 tablet:flex-row"
				use:enhance={() => {
					isSaving = true;
					return async ({ result, update }) => {
						await update({ reset: false });
						isSaving = false;
						if (result.type === 'success') isEditingDisplayName = false;
					};
				}}
			>
				<label class="flex-1">
					<span class="sr-only">{m.profile_display_name()}</span>
					<input
						name="displayName"
						value={form?.displayName ?? data.profile.displayName}
						maxlength="50"
						autocomplete="name"
						required
						aria-invalid={form?.displayNameError ? 'true' : undefined}
						class="w-full rounded-field border-outline px-4 py-2"
					/>
				</label>
				<div class="flex gap-2">
					<Button variant="filled" type="submit" disabled={isSaving}>{m.common_save()}</Button>
					<Button variant="outlined" onclick={() => (isEditingDisplayName = false)}
						>{m.common_cancel()}</Button
					>
				</div>
			</form>
			{#if form?.displayNameError}
				<p class="mt-2 text-sm text-error" role="alert">
					{describeErrorCode(form.displayNameError)}
				</p>
			{/if}
		{:else}
			<div class="mt-2 flex items-center justify-between gap-4">
				<p>{data.profile.displayName}</p>
				<Button variant="outlined" size="compact" onclick={() => (isEditingDisplayName = true)}
					>{m.common_edit()}</Button
				>
			</div>
			{#if form?.displayNameSaved}
				<p class="mt-2 text-sm text-on-surface-variant" role="status">{m.common_saved()}</p>
			{/if}
		{/if}
		<p class="mt-3 text-sm text-on-surface-variant">
			{m.profile_identity_notice()}
		</p>
	</section>

	<section class="mt-4 rounded-card border bg-surface p-4">
		<h2 class="text-lg font-semibold">{m.profile_school()}</h2>
		<form
			method="POST"
			action="?/updatePrimaryInstitutionVisibility"
			class="mt-2 flex items-center justify-between gap-4"
			use:enhance={() => {
				isSavingInstitutionVisibility = true;
				return async ({ update }) => {
					await update({ reset: false });
					isSavingInstitutionVisibility = false;
				};
			}}
		>
			<div class="min-w-0">
				<p>{data.profile.primaryInstitution.name}</p>
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
		<p class="mt-3 text-sm text-on-surface-variant">
			{m.profile_school_hiding_explanation()}
		</p>
	</section>

	<section class="mt-4 rounded-card border bg-surface p-4">
		<h2 class="text-lg font-semibold">{m.profile_language()}</h2>
		<div class="mt-2"><LanguagePicker isLabelVisible={false} /></div>
		<p class="mt-3 text-sm text-on-surface-variant">{m.profile_language_explanation()}</p>
	</section>

	<section class="mt-4 rounded-card border bg-surface p-4">
		<h2 class="text-lg font-semibold">{m.profile_account()}</h2>
		<p class="mt-2 text-sm text-on-surface-variant">
			{m.profile_account_explanation()}
		</p>
		<div class="mt-3 flex items-center gap-4">
			<UserButton />
			<SignOutButton class={buttonVariants({ variant: 'outlined', size: 'compact' })}
				>{m.auth_sign_out()}</SignOutButton
			>
		</div>
	</section>
</main>
