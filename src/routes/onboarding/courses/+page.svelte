<script lang="ts">
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
<main class="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
	<div class="flex items-center gap-3">
		<div class="flex flex-1 gap-2" aria-hidden="true">
			{#each [1, 2, 3] as segment (segment)}
				<span class="h-1.5 flex-1 rounded-full bg-blue-700"></span>
			{/each}
		</div>
		<a
			class="font-semibold text-blue-700"
			href={resolve('/(app)/explore')}
			data-sveltekit-preload-data="off">{m.onboarding_skip()}</a
		>
	</div>

	<p class="mt-8 font-mono text-sm text-blue-700">{m.onboarding_step({ step: 3, total: 3 })}</p>
	<h1 class="mt-2 text-3xl font-semibold">{m.onboarding_courses_heading()}</h1>
	<p class="mt-2 text-slate-600">
		{m.onboarding_courses_detail({ term: formatTerm(currentTerm()) })}
	</p>

	{#if courses.length === 0}
		<p class="mt-6 text-slate-600" role="status">
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
			<button
				type="button"
				class="mt-3 self-start rounded-full border px-4 py-1.5 disabled:opacity-50"
				disabled={coursesQuery.isFetchingNextPage}
				onclick={() => coursesQuery.fetchNextPage()}>{m.common_load_more()}</button
			>
		{/if}
	{/if}

	<div class="mt-auto pt-8">
		<p class="mb-3 text-sm text-slate-600">
			{m.onboarding_courses_private_notice()}
		</p>
		<a
			class="block w-full rounded-full bg-blue-700 py-3 text-center font-semibold text-white"
			href={resolve('/(app)/explore')}
			data-sveltekit-preload-data="off">{m.common_continue()}</a
		>
	</div>
</main>
