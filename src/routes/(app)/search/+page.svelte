<script lang="ts">
	import { toggleVariants } from '#lib/components/ui/toggle/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import SearchIcon from 'lucide-svelte/icons/search';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import { formatRelativeTime, THREAD_KIND_LABELS } from '#lib/client/content/PostPresentation.ts';
	import {
		formatTerm,
		HISTORY_STATUS_LABELS
	} from '#lib/client/history/AcademicHistoryPresentation.ts';
	import { HISTORY_STATUSES } from '#lib/contracts/AcademicHistoryContract.ts';
	import {
		SEARCH_MAX_PAGE,
		SEARCH_SCOPES,
		type SearchScope
	} from '#lib/contracts/SearchContract.ts';
	import { THREAD_ROUTE_IDS } from '#lib/navigation/CourseChannel.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const search = $derived(data.search);
	const query = $derived(search.query);
	const SCOPE_LABELS: Record<SearchScope, () => string> = {
		everything: m.search_scope_everything,
		courses: m.search_scope_courses,
		posts: m.search_scope_posts,
		people: m.search_scope_people
	};

	/** This search's query string with some parameters changed. */
	function searchQueryString(changes: Record<string, string | number | undefined>): string {
		const merged: Record<string, string | number | undefined> = {
			q: query.q || undefined,
			scope: query.scope,
			institutionId: search.institution?.id ?? '',
			courseId: query.courseId,
			status: query.status,
			...changes
		};
		return new URLSearchParams(
			Object.entries(merged).flatMap(([key, value]) =>
				value === undefined ? [] : [[key, String(value)]]
			)
		).toString();
	}

	/** Filters apply as soon as they change, keeping focus on the field that changed. */
	function applyFilters(event: Event & { currentTarget: HTMLSelectElement }) {
		const form = event.currentTarget.form;
		if (!form) return;
		const formData = new FormData(form);
		const parameters = new URLSearchParams(
			[...formData.entries()].map(([key, value]) => [key, String(value)])
		);
		// The path comes from resolve(); only the query string is added.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${resolve('/(app)/search')}?${parameters}`, { reset: false });
	}

	const sections = $derived([search.courses, search.posts, search.people]);
	const hasSearched = $derived(sections.some((section) => section !== null));
	const hasResults = $derived(sections.some((section) => section && section.results.length > 0));
	const isPaged = $derived(query.scope !== 'everything');
	const activeSection = $derived(
		query.scope === 'courses'
			? search.courses
			: query.scope === 'posts'
				? search.posts
				: search.people
	);
</script>

<svelte:head><title>{m.search_title()}</title></svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="sr-only">{m.search_title()}</h1>
	<form id="search-form" method="GET" role="search" class="relative">
		<input type="hidden" name="scope" value={query.scope} />
		<label class="relative block">
			<span class="sr-only">{m.search_label()}</span>
			<SearchIcon
				size={20}
				class="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-on-surface-variant"
			/>
			<input
				type="search"
				name="q"
				value={query.q}
				maxlength="100"
				placeholder={m.search_placeholder()}
				class="min-h-13 w-full rounded-full border-outline py-3 pr-14 pl-13 text-base"
			/>
		</label>
		<Button
			type="submit"
			variant="filled"
			size="icon"
			class="absolute top-1/2 right-1.5 size-10 -translate-y-1/2"
			aria-label={m.search_submit()}><ArrowRight /></Button
		>
	</form>

	<div class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
		<nav aria-label={m.search_scopes()} class="contents">
			{#each SEARCH_SCOPES as scope (scope)}
				<a
					href="{resolve('/(app)/search')}?{searchQueryString({
						scope,
						page: undefined,
						courseId: undefined,
						status: undefined
					})}"
					aria-current={scope === query.scope ? 'page' : undefined}
					class={toggleVariants({ variant: 'chip' })}>{SCOPE_LABELS[scope]()}</a
				>
			{/each}
		</nav>
		<span class="mx-1 hidden h-7 w-px bg-outline-variant tablet:block" aria-hidden="true"></span>
		{@render filterChip(m.search_school(), 'institutionId', [
			{ value: '', label: m.search_all_schools(), isSelected: !search.institution },
			...data.institutions.map((institution) => ({
				value: institution.id,
				label: institution.name,
				isSelected: institution.id === search.institution?.id
			}))
		])}
		{#if query.scope === 'people'}
			{#if search.courseOptions.length > 0}
				{@render filterChip(m.search_course(), 'courseId', [
					{ value: '', label: m.search_any_course(), isSelected: !query.courseId },
					...search.courseOptions.map((course) => ({
						value: course.id,
						label: `${course.code} · ${course.title}`,
						isSelected: course.id === query.courseId
					}))
				])}
			{/if}
			{@render filterChip(m.search_status(), 'status', [
				{ value: '', label: m.search_any_status(), isSelected: !query.status },
				...HISTORY_STATUSES.map((status) => ({
					value: status,
					label: HISTORY_STATUS_LABELS[status](),
					isSelected: status === query.status
				}))
			])}
		{/if}
	</div>

	{#snippet filterChip(
		label: string,
		name: string,
		options: { value: string; label: string; isSelected: boolean }[]
	)}
		<!-- A native select styled as a chip, so the filter works without JavaScript. -->
		<label
			class="{toggleVariants({
				variant: 'chip'
			})} gap-0 pr-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
		>
			<span class="whitespace-nowrap">{label}:</span>
			<select
				{name}
				form="search-form"
				onchange={applyFilters}
				class="field-sizing-content max-w-48 appearance-none border-0 bg-transparent bg-none py-0 pr-6 pl-1 text-sm font-semibold focus:ring-0 focus:outline-none"
			>
				{#each options as option (option.value)}
					<option value={option.value} selected={option.isSelected}>{option.label}</option>
				{/each}
			</select>
			<ChevronDown size={16} class="pointer-events-none -ml-5" aria-hidden="true" />
		</label>
	{/snippet}

	{#if query.scope === 'people'}
		<p class="mt-3 text-sm text-on-surface-variant">{m.search_people_explanation()}</p>
	{/if}

	{#if !hasSearched}
		<p class="mt-8 text-on-surface-variant">{m.search_prompt()}</p>
	{:else if !hasResults}
		<div class="mt-8 text-center">
			<p class="font-heading text-xl font-bold">
				{#if query.scope === 'people' && !query.q}
					{m.search_no_people()}
				{:else if search.institution}
					{m.search_no_results_at_school({ query: query.q, school: search.institution.name })}
				{:else}
					{m.search_no_results({ query: query.q })}
				{/if}
			</p>
			{#if search.institution}
				<Button
					variant="outlined"
					class="mt-4"
					href="{resolve('/(app)/search')}?{searchQueryString({
						institutionId: '',
						page: undefined,
						courseId: undefined
					})}">{m.search_try_all_schools()}</Button
				>
			{/if}
		</div>
	{/if}

	{#snippet sectionHeading(title: string, scope: SearchScope, hasMore: boolean)}
		<div class="mt-8 flex items-center justify-between gap-3">
			<h2 class="text-xl font-bold">{title}</h2>
			{#if !isPaged && hasMore}
				<Button
					variant="text"
					size="compact"
					href="{resolve('/(app)/search')}?{searchQueryString({ scope, page: undefined })}"
					>{m.search_see_all()}</Button
				>
			{/if}
		</div>
	{/snippet}

	{#if search.courses && search.courses.results.length > 0}
		{@render sectionHeading(m.search_scope_courses(), 'courses', search.courses.hasMore)}
		<ul class="mt-3 grid gap-3 tablet:grid-cols-2">
			{#each search.courses.results as course (course.id)}
				<li>
					<a
						href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
						class="flex h-full flex-col rounded-card border bg-surface px-5 py-4 transition-colors duration-150 hover:bg-surface-container"
					>
						<span class="font-mono text-sm font-semibold text-primary"
							>{course.code} · {course.institutionName}</span
						>
						<span class="mt-1.5 font-heading text-lg leading-snug font-bold wrap-break-word"
							>{course.title}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if search.posts && search.posts.results.length > 0}
		{@render sectionHeading(m.search_scope_posts(), 'posts', search.posts.hasMore)}
		<ul class="mt-3 divide-y overflow-hidden rounded-card border bg-surface">
			{#each search.posts.results as post (post.id)}
				<li>
					<a
						href={resolve(THREAD_ROUTE_IDS[post.kind], {
							courseId: post.courseId,
							postId: post.id
						})}
						class="block px-4 py-3 transition-colors duration-150 hover:bg-surface-container"
					>
						<span class="block text-sm text-on-surface-variant">
							{m.search_post_meta({
								courseCode: post.courseCode,
								kind: THREAD_KIND_LABELS[post.kind](),
								author: post.authorDisplayName
							})} ·
							<time datetime={post.lastActivityAt}>{formatRelativeTime(post.lastActivityAt)}</time>
						</span>
						<span class="mt-1 block font-heading font-bold wrap-break-word">{post.title}</span>
						<span class="mt-1 block font-reading wrap-break-word text-body">{post.snippet}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if search.people && search.people.results.length > 0}
		{@render sectionHeading(m.search_scope_people(), 'people', search.people.hasMore)}
		<ul class="mt-3 divide-y overflow-hidden rounded-card border bg-surface">
			{#each search.people.results as person (person.username)}
				<li>
					<a
						href={resolve('/(app)/users/[username]', { username: person.username })}
						class="flex items-start gap-3 px-4 py-3 hover:bg-surface-container"
					>
						<UserAvatar username={person.username} displayName={person.displayName} />
						<span class="min-w-0">
							<span class="block truncate font-semibold">{person.displayName}</span>
							<span class="block text-sm text-on-surface-variant">
								@{person.username}{person.primaryInstitutionName
									? ` · ${person.primaryInstitutionName}`
									: ''}
							</span>
							{#each person.matchedEntries as entry, index (index)}
								<span class="block text-sm text-on-surface-variant">
									{entry.term
										? m.search_person_entry({
												courseCode: entry.courseCode,
												status: HISTORY_STATUS_LABELS[entry.status](),
												term: formatTerm(entry.term)
											})
										: m.search_person_entry_no_term({
												courseCode: entry.courseCode,
												status: HISTORY_STATUS_LABELS[entry.status]()
											})}
								</span>
							{/each}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	{#if isPaged && activeSection && (query.page > 1 || activeSection.hasMore)}
		<div class="mt-4 flex gap-2">
			{#if query.page > 1}
				<Button
					variant="outlined"
					size="compact"
					href="{resolve('/(app)/search')}?{searchQueryString({ page: query.page - 1 })}"
					>{m.search_previous_page()}</Button
				>
			{/if}
			{#if activeSection.hasMore && query.page < SEARCH_MAX_PAGE}
				<Button
					variant="outlined"
					size="compact"
					href="{resolve('/(app)/search')}?{searchQueryString({ page: query.page + 1 })}"
					>{m.search_next_page()}</Button
				>
			{/if}
		</div>
	{/if}
</main>
