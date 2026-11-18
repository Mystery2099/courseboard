<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { CatalogCourseResponse } from '#lib/contracts/CourseCatalogContract.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const dateFormatter = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' });

	/** The catalog arrives sorted by school, so grouping keeps that order. */
	const coursesBySchool = $derived(
		Map.groupBy(data.courses, (course: CatalogCourseResponse) => course.institutionName)
	);
</script>

<svelte:head><title>{m.admin_section_moderators()}</title></svelte:head>

<h1 class="text-headline font-bold">{m.admin_section_moderators()}</h1>
<p class="mt-2 text-sm text-on-surface-variant">{m.admin_moderators_explanation()}</p>

<form method="POST" action="?/assign" use:enhance class="mt-6 flex flex-wrap items-end gap-2">
	<label class="flex min-w-0 flex-col text-sm">
		{m.admin_moderators_course()}
		<select name="courseId" required class="mt-1 min-h-11 max-w-full rounded-field px-3 text-base">
			<option value="">{m.admin_moderators_choose_course()}</option>
			{#each coursesBySchool as [schoolName, courses] (schoolName)}
				<optgroup label={schoolName}>
					{#each courses as course (course.id)}
						<option value={course.id}>{course.code} · {course.title}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	</label>
	<label class="flex flex-col text-sm">
		{m.admin_moderators_username()}
		<input
			name="username"
			required
			autocomplete="off"
			autocapitalize="none"
			spellcheck="false"
			value={form?.username ?? ''}
			aria-invalid={form?.assignError ? 'true' : undefined}
			aria-describedby={form?.assignError ? 'assign-moderator-error' : undefined}
			class="mt-1 min-h-11 rounded-field px-3 text-base"
		/>
	</label>
	<Button type="submit" variant="filled" size="compact">{m.admin_moderators_assign()}</Button>
</form>
{#if form?.assignError}
	<p id="assign-moderator-error" class="mt-2 text-sm text-error" role="alert">
		{describeErrorCode(form.assignError)}
	</p>
{/if}
{#if form?.assignedModerator}
	<p class="mt-2 text-sm" role="status">
		{m.admin_moderators_assigned({
			moderator: `@${form.assignedModerator.moderator.username}`,
			courseCode: form.assignedModerator.course.code
		})}
	</p>
{/if}
{#if form?.removeError}
	<p class="mt-4 text-sm text-error" role="alert">{describeErrorCode(form.removeError)}</p>
{/if}

<h2 class="mt-8 text-lg font-semibold">{m.admin_moderators_assignments()}</h2>
{#if data.hasMoreAssignments}
	<p class="mt-2 text-sm" role="status">
		{m.admin_moderators_truncated({ count: data.assignments.length })}
	</p>
{/if}
<div class="mt-2 overflow-x-auto rounded-card border bg-surface">
	<table class="w-full text-left text-sm">
		<thead class="text-xs tracking-wider text-on-surface-variant uppercase">
			<tr>
				<th scope="col" class="px-4 py-3">{m.admin_moderators_course()}</th>
				<th scope="col" class="px-4">{m.admin_catalog_school()}</th>
				<th scope="col" class="px-4">{m.admin_moderators_moderator()}</th>
				<th scope="col" class="px-4">{m.admin_moderators_since()}</th>
				<th scope="col" class="px-4"></th>
			</tr>
		</thead>
		<tbody>
			{#each data.assignments as assignment (assignment.id)}
				<tr class="border-t">
					<td class="px-4 py-3">
						<span class="font-mono font-semibold whitespace-nowrap">{assignment.course.code}</span>
						{assignment.course.title}
					</td>
					<td class="px-4 text-on-surface-variant">{assignment.course.institutionName}</td>
					<td class="px-4">
						{assignment.moderator.displayName}
						<span class="text-on-surface-variant">@{assignment.moderator.username}</span>
					</td>
					<td class="px-4 whitespace-nowrap">
						{dateFormatter.format(new Date(assignment.assignedAt))}
					</td>
					<td class="px-4">
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="assignmentId" value={assignment.id} />
							<Button
								type="submit"
								variant="destructive-text"
								size="compact"
								aria-label={m.admin_moderators_remove_label({
									moderator: `@${assignment.moderator.username}`,
									courseCode: assignment.course.code
								})}>{m.admin_moderators_remove()}</Button
							>
						</form>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" class="px-4 py-3 text-on-surface-variant">
						{m.admin_moderators_empty()}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
