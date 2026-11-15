<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { SignInButton, SignOutButton } from 'svelte-clerk';
	import LanguagePicker from '#lib/components/LanguagePicker.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<div class="mb-8 flex justify-end"><LanguagePicker /></div>
	<h1 class="text-2xl font-semibold">{m.app_name()}</h1>
	{#if data.currentUser?.status === 'suspended'}
		<p class="mt-4">{m.landing_account_suspended()}</p>
		<div class="mt-6"><SignOutButton>{m.auth_sign_out()}</SignOutButton></div>
	{:else if data.isSignedIn}
		<p class="mt-4">{m.landing_awaiting_invitation()}</p>
		<div class="mt-6"><SignOutButton>{m.auth_sign_out()}</SignOutButton></div>
	{:else}
		<p class="mt-4">{m.landing_invitation_only()}</p>
		<div class="mt-6"><SignInButton>{m.auth_sign_in()}</SignInButton></div>
	{/if}
</main>
