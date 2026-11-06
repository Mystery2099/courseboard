<script lang="ts">
	import { SignInButton, SignOutButton } from 'svelte-clerk';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="text-2xl font-semibold">Academic Discussion Platform</h1>
	{#if data.currentUser?.status === 'suspended'}
		<p class="mt-4">Your account is suspended.</p>
		<div class="mt-6"><SignOutButton /></div>
	{:else if data.isSignedIn}
		<p class="mt-4">
			Your account doesn't have access yet. Open the invitation link you were sent, and sign in with
			the email address it was sent to.
		</p>
		<div class="mt-6"><SignOutButton /></div>
	{:else}
		<p class="mt-4">Access is by invitation. Sign in to continue.</p>
		<div class="mt-6"><SignInButton /></div>
	{/if}
</main>
