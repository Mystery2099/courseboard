<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { DropdownMenu } from 'bits-ui';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import CourseCodeTile from '#lib/components/CourseCodeTile.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.explore_title()}</title></svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-3xl font-semibold">{m.explore_title()}</h1>

	{#if !data.catalog}
		<p class="mt-4 text-slate-600">{m.explore_no_courses()}</p>
	{:else}
		<div class="mt-6 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">
				{m.explore_courses_at({ institution: data.catalog.institution.name })}
			</h2>
			{#if data.institutions.length > 1}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="shrink-0 rounded-full border px-4 py-1.5"
						>{m.explore_change_institution()} ▾</DropdownMenu.Trigger
					>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={8}
							class="z-10 w-64 rounded-2xl border bg-white p-2 shadow-lg"
						>
							{#each data.institutions as institution (institution.id)}
								<DropdownMenu.Item>
									{#snippet child({ props })}
										<a
											{...props}
											href="{resolve('/(app)/explore')}?{new URLSearchParams({
												institutionId: institution.id
											})}"
											aria-current={institution.id === data.catalog?.institution.id
												? 'page'
												: undefined}
											class="block rounded-xl px-3 py-2 data-highlighted:bg-slate-100"
											>{institution.name}</a
										>
									{/snippet}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			{/if}
		</div>

		<ul class="mt-4 divide-y overflow-hidden rounded-[20px] border bg-white">
			{#each data.catalog.courses as course (course.id)}
				<li>
					<a
						href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
						class="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
					>
						<CourseCodeTile code={course.code} />
						<span class="min-w-0 flex-1">
							<span class="block truncate font-semibold">{course.title}</span>
							<span class="block text-sm text-slate-600">
								<span class="font-mono">{course.code}</span>{course.isFollowed
									? m.explore_following_suffix()
									: ''}
							</span>
						</span>
						<ChevronRight size={20} class="shrink-0" />
					</a>
				</li>
			{:else}
				<li class="px-4 py-3 text-slate-600">{m.explore_institution_empty()}</li>
			{/each}
		</ul>

		{#if data.catalog.nextCursor}
			<a
				class="mt-4 inline-block rounded-full border px-4 py-1.5"
				href="{resolve('/(app)/explore')}?{new URLSearchParams({
					institutionId: data.catalog.institution.id,
					after: data.catalog.nextCursor
				})}">{m.explore_next_courses()}</a
			>
		{/if}
		{#if page.url.searchParams.has('after')}
			<a
				class="mt-4 ml-2 inline-block rounded-full border px-4 py-1.5"
				href="{resolve('/(app)/explore')}?{new URLSearchParams({
					institutionId: data.catalog.institution.id
				})}">{m.explore_first_courses()}</a
			>
		{/if}
	{/if}
</main>
