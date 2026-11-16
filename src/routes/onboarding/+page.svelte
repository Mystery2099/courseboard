<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import Search from 'lucide-svelte/icons/search';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
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

<svelte:head><title>{m.onboarding_title()}</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
	<div class="flex items-center gap-3">
		{#if step === 'profile'}
			<button
				type="button"
				class={[buttonVariants({ variant: 'ghost', size: 'icon' }), '-ml-2']}
				aria-label={m.onboarding_back_to_school()}
				onclick={() => (step = 'school')}><ChevronLeft size={24} /></button
			>
		{/if}
		<div class="flex flex-1 gap-2" aria-hidden="true">
			{#each [1, 2, 3] as segment (segment)}
				<span
					class="h-1.5 flex-1 rounded-full {segment <= stepNumber
						? 'bg-primary'
						: 'bg-outline-variant'}"
				></span>
			{/each}
		</div>
	</div>

	<form
		method="POST"
		action="?/completeOnboarding"
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

		<p class="font-mono text-sm font-semibold text-primary">
			{m.onboarding_step({ step: stepNumber, total: 3 })}
		</p>

		{#if step === 'school'}
			<h1 class="mt-2 text-headline font-bold">{m.onboarding_school_heading()}</h1>
			<p class="mt-2 text-on-surface-variant">
				{m.onboarding_school_detail()}
			</p>

			{#if data.institutions.length === 0}
				{#if data.isAdministrator}
					<p class="mt-6 text-on-surface-variant" role="status">
						{m.onboarding_no_schools_administrator()}
					</p>
					<Button
						variant="outlined"
						class="mt-4"
						type="submit"
						formaction="?/loadDemoCatalog"
						formnovalidate>{m.onboarding_load_demo_catalog()}</Button
					>
				{:else}
					<p class="mt-6 text-on-surface-variant" role="status">
						{m.onboarding_no_schools()}
					</p>
				{/if}
			{:else}
				<label class="relative mt-6 block">
					<span class="sr-only">{m.onboarding_search_schools()}</span>
					<Search
						size={20}
						class="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant"
					/>
					<input
						type="search"
						bind:value={institutionQuery}
						placeholder={m.onboarding_search_schools()}
						class="min-h-13 w-full rounded-full border-outline py-3 pr-4 pl-12 text-base"
					/>
				</label>

				<fieldset class="mt-4">
					<legend class="sr-only">{m.onboarding_your_school()}</legend>
					<div class="flex flex-col gap-2">
						{#each matchingInstitutions as institution (institution.id)}
							<label
								class="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-outline bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface-container has-checked:border-primary has-checked:bg-secondary-container has-checked:text-on-secondary-container"
							>
								<span class="font-semibold">{institution.name}</span>
								<input
									type="radio"
									class="size-5"
									name="institutionChoice"
									value={institution.id}
									bind:group={primaryInstitutionId}
								/>
							</label>
						{:else}
							<p class="text-on-surface-variant">
								{m.onboarding_no_matching_schools({ query: institutionQuery })}
							</p>
						{/each}
					</div>
				</fieldset>
			{/if}
			{#if form?.errors.primaryInstitutionId}
				<p class="mt-3 text-sm text-error" role="alert">
					{describeErrorCode(form.errors.primaryInstitutionId)}
				</p>
			{/if}

			<div class="mt-auto pt-8">
				<Button
					variant="filled"
					class="w-full"
					disabled={!primaryInstitutionId}
					onclick={() => (step = 'profile')}>{m.common_continue()}</Button
				>
			</div>
		{:else}
			<h1 class="mt-2 text-headline font-bold">{m.onboarding_profile_heading()}</h1>
			<p class="mt-2 text-on-surface-variant">
				{m.onboarding_profile_detail()}
			</p>

			<label class="mt-6 block">
				<span class="font-semibold">{m.onboarding_display_name()}</span>
				<input
					name="displayName"
					bind:value={displayName}
					maxlength="50"
					autocomplete="name"
					required
					aria-invalid={form?.errors.displayName ? 'true' : undefined}
					aria-describedby={form?.errors.displayName ? 'display-name-error' : undefined}
					class="mt-2 min-h-12 w-full rounded-field border-outline px-4 py-3 text-base"
				/>
			</label>
			{#if form?.errors.displayName}
				<p id="display-name-error" class="mt-2 text-sm text-error">
					{describeErrorCode(form.errors.displayName)}
				</p>
			{/if}

			<label class="mt-6 block">
				<span class="font-semibold">{m.onboarding_username()}</span>
				<span
					class="mt-2 flex items-center rounded-field border border-outline bg-surface px-4 focus-within:border-2 focus-within:border-primary focus-within:px-[15px]"
				>
					<span class="text-on-surface-variant" aria-hidden="true">@</span>
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
						class="min-h-12 w-full border-0 bg-transparent py-3 pl-1 text-base focus:ring-0 focus:outline-none"
					/>
				</span>
			</label>
			<p id="username-help" class="mt-2 text-sm text-on-surface-variant">
				{m.onboarding_username_help()}
			</p>
			{#if form?.errors.username}
				<p class="mt-1 text-sm text-error" role="alert">
					{describeErrorCode(form.errors.username)}
				</p>
			{/if}

			<div class="mt-auto pt-8">
				<Button variant="filled" class="w-full" type="submit" disabled={isSubmitting}
					>{isSubmitting ? m.common_saving() : m.common_continue()}</Button
				>
			</div>
		{/if}
	</form>
</main>
