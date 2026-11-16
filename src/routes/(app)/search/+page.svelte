<script lang="ts">
	import { resolve } from '$app/paths';
	import SearchIcon from 'lucide-svelte/icons/search';
	import CourseCodeTile from '#lib/components/CourseCodeTile.svelte';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import { buttonClass, filterChipClass } from '#lib/components/ui/ControlStyles.ts';
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
	<form method="GET" role="search" class="flex flex-col gap-3">
		<input type="hidden" name="scope" value={query.scope} />
		<label class="relative block">
			<span class="sr-only">{m.search_label()}</span>
			<SearchIcon
				size={20}
				class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant"
			/>
			<input
				type="search"
				name="q"
				value={query.q}
				maxlength="100"
				placeholder={m.search_placeholder()}
				class="w-full rounded-full py-3 pr-4 pl-12 text-base"
			/>
		</label>
		<div class="flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1 text-sm">
				<span class="font-semibold">{m.search_school()}</span>
				<select name="institutionId" class="rounded-field py-2 pr-8 pl-3 text-base">
					<option value="" selected={!search.institution}>{m.search_all_schools()}</option>
					{#each data.institutions as institution (institution.id)}
						<option value={institution.id} selected={institution.id === search.institution?.id}
							>{institution.name}</option
						>
					{/each}
				</select>
			</label>
			{#if query.scope === 'people'}
				{#if search.courseOptions.length > 0}
					<label class="flex flex-col gap-1 text-sm">
						<span class="font-semibold">{m.search_course()}</span>
						<select name="courseId" class="rounded-field py-2 pr-8 pl-3 text-base">
							<option value="">{m.search_any_course()}</option>
							{#each search.courseOptions as course (course.id)}
								<option value={course.id} selected={course.id === query.courseId}
									>{course.code} · {course.title}</option
								>
							{/each}
						</select>
					</label>
				{/if}
				<label class="flex flex-col gap-1 text-sm">
					<span class="font-semibold">{m.search_status()}</span>
					<select name="status" class="rounded-field py-2 pr-8 pl-3 text-base">
						<option value="">{m.search_any_status()}</option>
						{#each HISTORY_STATUSES as status (status)}
							<option value={status} selected={status === query.status}
								>{HISTORY_STATUS_LABELS[status]()}</option
							>
						{/each}
					</select>
				</label>
			{/if}
			<button type="submit" class={buttonClass('filled', 'compact')}>{m.search_submit()}</button>
		</div>
	</form>

	<nav aria-label={m.search_scopes()} class="mt-4 flex flex-wrap gap-x-2 gap-y-3 py-1.5">
		{#each SEARCH_SCOPES as scope (scope)}
			<a
				href="{resolve('/(app)/search')}?{searchQueryString({
					scope,
					page: undefined,
					courseId: undefined,
					status: undefined
				})}"
				aria-current={scope === query.scope ? 'page' : undefined}
				class={filterChipClass(scope === query.scope)}>{SCOPE_LABELS[scope]()}</a
			>
		{/each}
	</nav>

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
				<a
					href="{resolve('/(app)/search')}?{searchQueryString({
						institutionId: '',
						page: undefined,
						courseId: undefined
					})}"
					class={[buttonClass('outlined'), 'mt-4']}>{m.search_try_all_schools()}</a
				>
			{/if}
		</div>
	{/if}

	{#snippet sectionHeading(title: string, scope: SearchScope, hasMore: boolean)}
		<div class="mt-8 flex items-center justify-between gap-3">
			<h2 class="text-xl font-bold">{title}</h2>
			{#if !isPaged && hasMore}
				<a
					href="{resolve('/(app)/search')}?{searchQueryString({ scope, page: undefined })}"
					class={buttonClass('text', 'compact')}>{m.search_see_all()}</a
				>
			{/if}
		</div>
	{/snippet}

	{#if search.courses && search.courses.results.length > 0}
		{@render sectionHeading(m.search_scope_courses(), 'courses', search.courses.hasMore)}
		<ul class="mt-3 divide-y overflow-hidden rounded-card border bg-surface">
			{#each search.courses.results as course (course.id)}
				<li>
					<a
						href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
						class="flex items-center gap-4 px-4 py-3 hover:bg-surface-container"
					>
						<CourseCodeTile code={course.code} />
						<span class="min-w-0">
							<span class="block font-mono text-sm font-semibold text-primary"
								>{course.code} · {course.institutionName}</span
							>
							<span class="block truncate font-heading font-bold">{course.title}</span>
						</span>
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
						class="block px-4 py-3 hover:bg-surface-container"
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
				<a
					href="{resolve('/(app)/search')}?{searchQueryString({ page: query.page - 1 })}"
					class={buttonClass('outlined', 'compact')}>{m.search_previous_page()}</a
				>
			{/if}
			{#if activeSection.hasMore && query.page < SEARCH_MAX_PAGE}
				<a
					href="{resolve('/(app)/search')}?{searchQueryString({ page: query.page + 1 })}"
					class={buttonClass('outlined', 'compact')}>{m.search_next_page()}</a
				>
			{/if}
		</div>
	{/if}
</main>
