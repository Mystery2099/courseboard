<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import Check from 'lucide-svelte/icons/check';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import CourseCodeTile from '#lib/components/CourseCodeTile.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.explore_title()}</title></svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-headline font-bold">{m.explore_title()}</h1>

	{#if !data.catalog}
		<p class="mt-4 text-on-surface-variant">{m.explore_no_courses()}</p>
	{:else}
		<div class="mt-6 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">
				{m.explore_courses_at({ institution: data.catalog.institution.name })}
			</h2>
			{#if data.institutions.length > 1}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={buttonVariants({
							variant: 'outlined',
							size: 'compact',
							class: 'text-on-surface'
						})}>{m.explore_change_institution()} <ChevronDown /></DropdownMenu.Trigger
					>
					<DropdownMenu.Content align="end" sideOffset={8} class="w-72">
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
										>{institution.name}
										{#if institution.id === data.catalog?.institution.id}<Check
												class="ml-auto"
											/>{/if}</a
									>
								{/snippet}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>

		<ul class="mt-4 divide-y overflow-hidden rounded-card border bg-surface">
			{#each data.catalog.courses as course (course.id)}
				<li>
					<a
						href={resolve('/(app)/courses/[courseId]', { courseId: course.id })}
						class="flex min-h-18 items-center gap-4 state-layer px-4 py-3 transition-colors duration-150 [--state-base:var(--surface)]"
					>
						<CourseCodeTile code={course.code} />
						<span class="min-w-0 flex-1">
							<!-- The tile shows the code visually; screen readers get it here. -->
							<span class="sr-only">{course.code}</span>
							<span class="block truncate text-lg font-medium">{course.title}</span>
							{#if course.isFollowed}
								<span class="block text-sm text-on-surface-variant">{m.explore_following()}</span>
							{/if}
						</span>
						<ChevronRight size={20} class="shrink-0" />
					</a>
				</li>
			{:else}
				<li class="px-4 py-3 text-on-surface-variant">{m.explore_institution_empty()}</li>
			{/each}
		</ul>

		{#if data.catalog.nextCursor}
			<Button
				variant="outlined"
				size="compact"
				class="mt-4"
				href="{resolve('/(app)/explore')}?{new URLSearchParams({
					institutionId: data.catalog.institution.id,
					after: data.catalog.nextCursor
				})}">{m.explore_next_courses()}</Button
			>
		{/if}
		{#if page.url.searchParams.has('after')}
			<Button
				variant="outlined"
				size="compact"
				class="mt-4 ml-2"
				href="{resolve('/(app)/explore')}?{new URLSearchParams({
					institutionId: data.catalog.institution.id
				})}">{m.explore_first_courses()}</Button
			>
		{/if}
	{/if}
</main>
