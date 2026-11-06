<script lang="ts">
	import { resolve } from '$app/paths';
	import { UserButton } from 'svelte-clerk';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<header class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
	<nav class="flex gap-4 text-sm">
		<a href={resolve('/(app)/explore')}>Explore</a>
		{#if data.currentUser?.role === 'administrator'}
			<a href={resolve('/(app)/admin/invitations')}>Invitations</a>
		{/if}
	</nav>
	<UserButton />
</header>

<main class="mx-auto max-w-4xl px-4 py-8">
	{@render children()}
</main>
