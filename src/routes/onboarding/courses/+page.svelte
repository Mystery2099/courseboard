<script lang="ts">
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

<svelte:head><title>Add your courses</title></svelte:head>

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
			data-sveltekit-preload-data="off">Skip</a
		>
	</div>

	<p class="mt-8 font-mono text-sm text-blue-700">Step 3 of 3</p>
	<h1 class="mt-2 text-3xl font-semibold">What are you taking this term?</h1>
	<p class="mt-2 text-slate-600">
		Adding a course to your history and following it are separate. Do either, both, or neither.
		History entries are recorded as Taking, {formatTerm(currentTerm())}.
	</p>

	{#if courses.length === 0}
		<p class="mt-6 text-slate-600" role="status">
			{institution.name} has no courses yet. You can add history from your profile later.
		</p>
	{:else}
		<ul class="mt-6 flex flex-col gap-3" aria-label="Courses at {institution.name}">
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
				onclick={() => coursesQuery.fetchNextPage()}>Load more</button
			>
		{/if}
	{/if}

	<div class="mt-auto pt-8">
		<p class="mb-3 text-sm text-slate-600">
			New history entries are private. Make any of them visible from your profile.
		</p>
		<a
			class="block w-full rounded-full bg-blue-700 py-3 text-center font-semibold text-white"
			href={resolve('/(app)/explore')}
			data-sveltekit-preload-data="off">Continue</a
		>
	</div>
</main>
