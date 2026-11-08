<script lang="ts">
	import { createInfiniteQuery, createQuery } from '@tanstack/svelte-query';
	import { untrack } from 'svelte';
	import CourseCodeTile from '#lib/components/CourseCodeTile.svelte';
	import {
		CourseCatalogApiClient,
		courseCatalogQueryKeys
	} from '#lib/client/catalog/CourseCatalogApiClient.ts';
	import type { HistoryCourseResponse } from '#lib/contracts/AcademicHistoryContract.ts';

	let {
		defaultInstitutionId,
		onSelect
	}: {
		defaultInstitutionId: string | null;
		onSelect: (course: HistoryCourseResponse) => void;
	} = $props();

	let selectedInstitutionId = $state(untrack(() => defaultInstitutionId));

	const institutionsQuery = createQuery(() => ({
		queryKey: courseCatalogQueryKeys.institutions(),
		queryFn: CourseCatalogApiClient.listInstitutions,
		staleTime: 5 * 60_000
	}));

	const institutionId = $derived(
		selectedInstitutionId ?? institutionsQuery.data?.institutions[0]?.id ?? null
	);

	const coursesQuery = createInfiniteQuery(() => ({
		queryKey: courseCatalogQueryKeys.courses(institutionId ?? ''),
		queryFn: ({ pageParam }) => CourseCatalogApiClient.browseCourses(institutionId!, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		enabled: institutionId !== null
	}));

	const courses = $derived(coursesQuery.data?.pages.flatMap((page) => page.courses) ?? []);
	const institution = $derived(coursesQuery.data?.pages[0]?.institution ?? null);
</script>

<div class="flex flex-col gap-3">
	<label class="flex flex-col gap-1">
		<span class="text-sm font-semibold">School</span>
		<select
			class="rounded-2xl border-slate-300 px-4 py-2"
			value={institutionId ?? ''}
			onchange={(event) => (selectedInstitutionId = event.currentTarget.value)}
			disabled={!institutionsQuery.data}
		>
			{#each institutionsQuery.data?.institutions ?? [] as option (option.id)}
				<option value={option.id}>{option.name}</option>
			{/each}
		</select>
	</label>

	{#if institutionsQuery.isError || coursesQuery.isError}
		<p class="text-sm text-red-700" role="alert">Courses couldn't be loaded. Try again.</p>
	{:else if coursesQuery.isPending}
		<p class="text-sm text-slate-600">Loading courses…</p>
	{:else}
		<ul class="max-h-72 divide-y overflow-y-auto rounded-[20px] border" aria-label="Courses">
			{#each courses as course (course.id)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
						onclick={() =>
							institution &&
							onSelect({ id: course.id, code: course.code, title: course.title, institution })}
					>
						<CourseCodeTile code={course.code} />
						<span class="min-w-0">
							<span class="block truncate font-semibold">{course.title}</span>
							<span class="block font-mono text-sm text-slate-600">{course.code}</span>
						</span>
					</button>
				</li>
			{:else}
				<li class="px-4 py-3 text-slate-600">This school has no courses yet.</li>
			{/each}
		</ul>
		{#if coursesQuery.hasNextPage}
			<button
				type="button"
				class="self-start rounded-full border px-4 py-1.5 disabled:opacity-50"
				disabled={coursesQuery.isFetchingNextPage}
				onclick={() => coursesQuery.fetchNextPage()}>Load more</button
			>
		{/if}
	{/if}
</div>
