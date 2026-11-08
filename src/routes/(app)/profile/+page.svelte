<script lang="ts">
	import { enhance } from '$app/forms';
	import { SignOutButton, UserButton, useClerkContext } from 'svelte-clerk';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import AcademicHistorySection from '#lib/components/history/AcademicHistorySection.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const clerkContext = useClerkContext();
	const imageUrl = $derived(clerkContext.user?.hasImage ? clerkContext.user.imageUrl : null);

	let isEditingDisplayName = $state(false);
	let isSaving = $state(false);
</script>

<svelte:head><title>Your profile</title></svelte:head>

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
		<h2 class="text-lg font-semibold">Display name</h2>
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
					<span class="sr-only">Display name</span>
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
						disabled={isSaving}>Save</button
					>
					<button
						type="button"
						class="rounded-full border px-4 py-2"
						onclick={() => (isEditingDisplayName = false)}>Cancel</button
					>
				</div>
			</form>
			{#if form?.displayNameError}
				<p class="mt-2 text-sm text-red-700" role="alert">{form.displayNameError}</p>
			{/if}
		{:else}
			<div class="mt-2 flex items-center justify-between gap-4">
				<p>{data.profile.displayName}</p>
				<button
					type="button"
					class="rounded-full border px-4 py-1.5"
					onclick={() => (isEditingDisplayName = true)}>Edit</button
				>
			</div>
			{#if form?.displayNameSaved}
				<p class="mt-2 text-sm text-slate-600" role="status">Saved.</p>
			{/if}
		{/if}
		<p class="mt-3 text-sm text-slate-600">
			Your username can't be changed. Your email address is never shown to other students.
		</p>
	</section>

	<section class="mt-4 rounded-[20px] border bg-white p-4">
		<h2 class="text-lg font-semibold">Account</h2>
		<p class="mt-2 text-sm text-slate-600">
			Profile photo, email, password, and sign-in settings. Open the account menu and choose Manage
			account.
		</p>
		<div class="mt-3 flex items-center gap-4">
			<UserButton />
			<SignOutButton class="rounded-full border px-4 py-1.5" />
		</div>
	</section>
</main>
