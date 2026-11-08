<script lang="ts">
	import { enhance } from '$app/forms';
	import Search from 'lucide-svelte/icons/search';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type OnboardingStep = 'school' | 'profile';

	let step = $state<OnboardingStep>('school');
	let institutionQuery = $state('');
	let primaryInstitutionId = $state('');
	let username = $state('');
	let displayName = $state('');
	let isSubmitting = $state(false);

	$effect(() => {
		if (!form) return;
		primaryInstitutionId = form.submitted.primaryInstitutionId;
		username = form.submitted.username;
		displayName = form.submitted.displayName;
		step = form.errors.primaryInstitutionId ? 'school' : 'profile';
	});

	const matchingInstitutions = $derived(
		data.institutions.filter((institution) =>
			institution.name.toLowerCase().includes(institutionQuery.trim().toLowerCase())
		)
	);
	const stepNumber = $derived(step === 'school' ? 1 : 2);
</script>

<svelte:head><title>Set up your profile</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
	<div class="flex items-center gap-3">
		{#if step === 'profile'}
			<button
				type="button"
				class="-ml-2 rounded-full p-2"
				aria-label="Back to choosing your school"
				onclick={() => (step = 'school')}><ChevronLeft size={24} /></button
			>
		{/if}
		<div class="flex flex-1 gap-2" aria-hidden="true">
			{#each [1, 2] as segment (segment)}
				<span
					class="h-1.5 flex-1 rounded-full {segment <= stepNumber ? 'bg-blue-700' : 'bg-slate-200'}"
				></span>
			{/each}
		</div>
	</div>

	<form
		method="POST"
		class="mt-8 flex flex-1 flex-col"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				isSubmitting = false;
			};
		}}
	>
		<input type="hidden" name="primaryInstitutionId" value={primaryInstitutionId} />

		<p class="font-mono text-sm text-blue-700">Step {stepNumber} of 2</p>

		{#if step === 'school'}
			<h1 class="mt-2 text-3xl font-semibold">Where do you study?</h1>
			<p class="mt-2 text-slate-600">
				This sets your default for course search. You can browse other schools anytime.
			</p>

			{#if data.institutions.length === 0}
				<p class="mt-6 text-slate-600" role="status">
					No schools have been added yet. Ask an administrator to add yours.
				</p>
			{:else}
				<label class="relative mt-6 block">
					<span class="sr-only">Search schools</span>
					<Search size={20} class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-500" />
					<input
						type="search"
						bind:value={institutionQuery}
						placeholder="Search schools"
						class="w-full rounded-full border-slate-300 py-3 pr-4 pl-12"
					/>
				</label>

				<fieldset class="mt-4">
					<legend class="sr-only">Your school</legend>
					<div class="flex flex-col gap-2">
						{#each matchingInstitutions as institution (institution.id)}
							<label
								class="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 has-checked:border-blue-700 has-checked:bg-blue-50"
							>
								<span class="font-semibold">{institution.name}</span>
								<input
									type="radio"
									name="institutionChoice"
									value={institution.id}
									bind:group={primaryInstitutionId}
								/>
							</label>
						{:else}
							<p class="text-slate-600">No schools match “{institutionQuery}”.</p>
						{/each}
					</div>
				</fieldset>
			{/if}
			{#if form?.errors.primaryInstitutionId}
				<p class="mt-3 text-sm text-red-700" role="alert">{form.errors.primaryInstitutionId}</p>
			{/if}

			<div class="mt-auto pt-8">
				<button
					type="button"
					class="w-full rounded-full bg-blue-700 py-3 font-semibold text-white disabled:opacity-50"
					disabled={!primaryInstitutionId}
					onclick={() => (step = 'profile')}>Continue</button
				>
			</div>
		{:else}
			<h1 class="mt-2 text-3xl font-semibold">A little about you</h1>
			<p class="mt-2 text-slate-600">
				Other students see your display name and username. Your email stays private.
			</p>

			<label class="mt-6 block">
				<span class="font-semibold">Display name</span>
				<input
					name="displayName"
					bind:value={displayName}
					maxlength="50"
					autocomplete="name"
					required
					aria-invalid={form?.errors.displayName ? 'true' : undefined}
					aria-describedby={form?.errors.displayName ? 'display-name-error' : undefined}
					class="mt-2 w-full rounded-2xl border-slate-300 px-4 py-3"
				/>
			</label>
			{#if form?.errors.displayName}
				<p id="display-name-error" class="mt-2 text-sm text-red-700">{form.errors.displayName}</p>
			{/if}

			<label class="mt-6 block">
				<span class="font-semibold">Username</span>
				<span class="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4">
					<span class="text-slate-500" aria-hidden="true">@</span>
					<input
						name="username"
						bind:value={username}
						maxlength="24"
						autocomplete="username"
						autocapitalize="none"
						spellcheck="false"
						required
						aria-invalid={form?.errors.username ? 'true' : undefined}
						aria-describedby="username-help"
						class="w-full border-0 py-3 pl-1 focus:ring-0"
					/>
				</span>
			</label>
			<p id="username-help" class="mt-2 text-sm text-slate-600">
				3 to 24 letters, numbers, or underscores. You can't change it later.
			</p>
			{#if form?.errors.username}
				<p class="mt-1 text-sm text-red-700" role="alert">{form.errors.username}</p>
			{/if}

			<div class="mt-auto pt-8">
				<button
					type="submit"
					class="w-full rounded-full bg-blue-700 py-3 font-semibold text-white disabled:opacity-50"
					disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Finish'}</button
				>
			</div>
		{/if}
	</form>
</main>
