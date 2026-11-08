<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const adminSections = [
		{
			label: 'Invitations',
			routeId: '/(app)/admin/invitations',
			href: resolve('/(app)/admin/invitations')
		},
		{
			label: 'Course catalog',
			routeId: '/(app)/admin/catalog',
			href: resolve('/(app)/admin/catalog')
		}
	];
</script>

<div class="desktop:flex">
	<nav
		aria-label="Admin"
		class="border-b bg-slate-50 px-3 py-4 desktop:sticky desktop:top-0 desktop:h-dvh desktop:w-64 desktop:shrink-0 desktop:border-r desktop:border-b-0 desktop:py-6"
	>
		<p class="px-3 font-mono text-sm font-semibold text-blue-700">platform admin</p>
		<p class="px-3 text-2xl font-semibold">Admin</p>
		<ul class="mt-4 flex gap-1 overflow-x-auto desktop:flex-col">
			{#each adminSections as section (section.routeId)}
				<li>
					<a
						href={section.href}
						aria-current={page.route.id === section.routeId ? 'page' : undefined}
						class={[
							'block rounded-xl px-3 py-2 whitespace-nowrap',
							page.route.id === section.routeId && 'bg-indigo-100 font-semibold'
						]}>{section.label}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
	<main class="min-w-0 flex-1 px-4 py-8 desktop:px-10">
		{@render children()}
	</main>
</div>
