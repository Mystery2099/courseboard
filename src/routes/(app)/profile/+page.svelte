<script lang="ts">
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
			<p class="text-slate-600">
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

	<section class="mt-8 rounded-[20px] border bg-white p-4">
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
						class="w-full rounded-2xl border-slate-300 px-4 py-2"
					/>
				</label>
				<div class="flex gap-2">
					<button
						type="submit"
						class="rounded-full bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
						disabled={isSaving}>{m.common_save()}</button
					>
					<button
						type="button"
						class="rounded-full border px-4 py-2"
						onclick={() => (isEditingDisplayName = false)}>{m.common_cancel()}</button
					>
				</div>
			</form>
			{#if form?.displayNameError}
				<p class="mt-2 text-sm text-red-700" role="alert">{describeErrorCode(form.displayNameError)}</p>
			{/if}
		{:else}
			<div class="mt-2 flex items-center justify-between gap-4">
				<p>{data.profile.displayName}</p>
				<button
					type="button"
					class="rounded-full border px-4 py-1.5"
					onclick={() => (isEditingDisplayName = true)}>{m.common_edit()}</button
				>
			</div>
			{#if form?.displayNameSaved}
				<p class="mt-2 text-sm text-slate-600" role="status">{m.common_saved()}</p>
			{/if}
		{/if}
		<p class="mt-3 text-sm text-slate-600">
			{m.profile_identity_notice()}
		</p>
	</section>

	<section class="mt-4 rounded-[20px] border bg-white p-4">
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
				<p class="text-sm text-slate-600">
					{data.profile.isPrimaryInstitutionHidden
						? m.profile_school_hidden()
						: m.profile_school_shown()}
				</p>
			</div>
			<button
				type="submit"
				name="isPrimaryInstitutionHidden"
				value={data.profile.isPrimaryInstitutionHidden ? 'false' : 'true'}
				class="shrink-0 rounded-full border px-4 py-1.5 disabled:opacity-50"
				disabled={isSavingInstitutionVisibility}
				>{data.profile.isPrimaryInstitutionHidden
					? m.profile_school_show()
					: m.profile_school_hide()}</button
			>
		</form>
		{#if form?.institutionVisibilityError}
			<p class="mt-2 text-sm text-red-700" role="alert">{describeErrorCode(form.institutionVisibilityError)}</p>
		{:else if form?.institutionVisibilitySaved}
			<p class="mt-2 text-sm text-slate-600" role="status">{m.common_saved()}</p>
		{/if}
		<p class="mt-3 text-sm text-slate-600">
			{m.profile_school_hiding_explanation()}
		</p>
	</section>

	<section class="mt-4 rounded-[20px] border bg-white p-4">
		<h2 class="text-lg font-semibold">{m.profile_language()}</h2>
		<div class="mt-2"><LanguagePicker isLabelVisible={false} /></div>
		<p class="mt-3 text-sm text-slate-600">{m.profile_language_explanation()}</p>
	</section>

	<section class="mt-4 rounded-[20px] border bg-white p-4">
		<h2 class="text-lg font-semibold">{m.profile_account()}</h2>
		<p class="mt-2 text-sm text-slate-600">
			{m.profile_account_explanation()}
		</p>
		<div class="mt-3 flex items-center gap-4">
			<UserButton />
			<SignOutButton class="rounded-full border px-4 py-1.5" />
		</div>
	</section>
</main>
