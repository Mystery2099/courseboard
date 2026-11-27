<script lang="ts">
	import { badgeVariants } from '#lib/components/ui/badge/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { resolve } from '$app/paths';
	import { createQuery } from '@tanstack/svelte-query';
	import ProfileHeader from '#lib/components/profile/ProfileHeader.svelte';
	import VisibleHistoryList from '#lib/components/history/VisibleHistoryList.svelte';
	import {
		AcademicHistoryApiClient,
		academicHistoryQueryKeys
	} from '#lib/client/history/AcademicHistoryApiClient.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const historyQuery = createQuery(() => ({
		queryKey: academicHistoryQueryKeys.visible(data.person.username),
		queryFn: () => AcademicHistoryApiClient.listVisibleEntries(data.person.username),
		initialData: data.history,
		initialDataUpdatedAt: data.historyLoadedAt
	}));

	// Other schools appear only through visible entries, so private history never reveals them. A
	// hidden primary school is listed the same way when a visible entry is there.
	const otherInstitutionNames = $derived([
		...new Set(
			historyQuery.data.entries
				.map((entry) => entry.course.institution)
				.filter((institution) => institution.id !== data.person.primaryInstitution?.id)
				.map((institution) => institution.name)
		)
	]);
</script>

<svelte:head
	><title
		>{m.person_title({
			displayName: data.person.displayName,
			username: data.person.username
		})}</title
	></svelte:head
>

<main class="mx-auto max-w-3xl pb-8">
	<ProfileHeader
		username={data.person.username}
		displayName={data.person.displayName}
		imageUrl={data.person.imageUrl}
	>
		{#if data.person.primaryInstitution || otherInstitutionNames.length > 0}
			<ul class="mt-4 flex flex-wrap gap-2" aria-label={m.person_schools()}>
				{#if data.person.primaryInstitution}
					<li class={badgeVariants({ variant: 'secondary' })}>
						{data.person.primaryInstitution.name}
					</li>
				{/if}
				{#each otherInstitutionNames as institutionName (institutionName)}
					<li class={badgeVariants({ variant: 'neutral' })}>{institutionName}</li>
				{/each}
			</ul>
		{/if}
	</ProfileHeader>

	{#if data.person.isOwnProfile}
		<p class="mx-4 mt-6 rounded-card bg-secondary-container p-4 text-sm desktop:mx-8" role="status">
			{m.person_own_profile_notice()}
			<a
				class="font-semibold text-primary underline-offset-2 hover:underline"
				href={resolve('/(app)/profile')}>{m.person_edit_profile()}</a
			>
		</p>
	{/if}

	<section class="mt-6 px-4 desktop:px-8" aria-labelledby="history-heading">
		<h2 id="history-heading" class="text-xl font-semibold">{m.history_heading()}</h2>
		<p class="mt-2 text-sm text-on-surface-variant">
			{m.person_history_attribution({ displayName: data.person.displayName })}
		</p>
		{#if historyQuery.isError}
			<p class="mt-2 text-sm text-on-surface-variant" role="status">
				{m.person_history_refresh_failed()}
			</p>
		{/if}
		<VisibleHistoryList entries={historyQuery.data.entries} />
	</section>
</main>
