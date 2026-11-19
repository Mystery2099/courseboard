<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { createInfiniteQuery, createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import OnboardingCourseCard from '#lib/components/onboarding/OnboardingCourseCard.svelte';
	import {
		CourseCatalogApiClient,
		courseCatalogQueryKeys
	} from '#lib/client/catalog/CourseCatalogApiClient.ts';
	import {
		AcademicHistoryApiClient,
		academicHistoryQueryKeys
	} from '#lib/client/history/AcademicHistoryApiClient.ts';
	import { currentTerm, formatTerm } from '#lib/client/history/AcademicHistoryPresentation.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const institution = $derived(data.catalog.institution);

	// The server render seeds both caches; from then on the queries own this data.
	const coursesQuery = createInfiniteQuery(() => ({
		queryKey: courseCatalogQueryKeys.courses(institution.id),
		queryFn: ({ pageParam }) => CourseCatalogApiClient.browseCourses(institution.id, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialData: { pages: [data.catalog], pageParams: [null] },
		initialDataUpdatedAt: data.loadedAt
	}));

	const historyQuery = createQuery(() => ({
		queryKey: academicHistoryQueryKeys.own(),
		queryFn: AcademicHistoryApiClient.listOwnEntries,
		initialData: data.history,
		initialDataUpdatedAt: data.loadedAt
	}));

	const courses = $derived(coursesQuery.data.pages.flatMap((page) => page.courses));
	const historyEntriesByCourseId = $derived(
		Map.groupBy(historyQuery.data.entries, (entry) => entry.course.id)
	);
</script>

<svelte:head><title>{m.onboarding_courses_title()}</title></svelte:head>

<!-- Explore is loaded on the click, not on hover, so it shows the courses followed on this step. -->
<main class="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-8">
	<div class="flex items-center gap-3">
		<div class="flex flex-1 gap-2" aria-hidden="true">
			{#each [1, 2, 3] as segment (segment)}
				<span class="h-1.5 flex-1 rounded-full bg-primary"></span>
			{/each}
		</div>
		<a
			class="font-semibold text-primary underline-offset-2 hover:underline"
			href={resolve('/(app)/explore')}
			data-sveltekit-preload-data={false}>{m.onboarding_skip()}</a
		>
	</div>

	<p class="mt-8 font-mono text-sm font-semibold text-primary">
		{m.onboarding_step({ step: 3, total: 3 })}
	</p>
	<h1 class="mt-2 text-headline font-bold">{m.onboarding_courses_heading()}</h1>
	<p class="mt-2 text-on-surface-variant">
		{m.onboarding_courses_detail({ term: formatTerm(currentTerm()) })}
	</p>

	{#if courses.length === 0}
		<p class="mt-6 text-on-surface-variant" role="status">
			{m.onboarding_courses_empty({ institution: institution.name })}
		</p>
	{:else}
		<ul
			class="mt-6 flex flex-col gap-3"
			aria-label={m.onboarding_courses_list({ institution: institution.name })}
		>
			{#each courses as course (course.id)}
				<OnboardingCourseCard
					{course}
					institutionId={institution.id}
					historyEntries={historyEntriesByCourseId.get(course.id) ?? []}
				/>
			{/each}
		</ul>
		{#if coursesQuery.hasNextPage}
			<Button
				variant="outlined"
				size="compact"
				class="mt-3 self-start"
				disabled={coursesQuery.isFetchingNextPage}
				onclick={() => coursesQuery.fetchNextPage()}>{m.common_load_more()}</Button
			>
		{/if}
	{/if}

	<!-- Choices save as they're made, so Continue stays in reach however long the list is. -->
	<div
		class="sticky bottom-0 mt-auto bg-background pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
	>
		<p class="mb-3 text-sm text-on-surface-variant">
			{m.onboarding_courses_private_notice()}
		</p>
		<Button
			variant="filled"
			class="flex w-full"
			href={resolve('/(app)/explore')}
			data-sveltekit-preload-data={false}>{m.common_continue()}</Button
		>
	</div>
</main>
