<script lang="ts">
	import { page } from '$app/state';
	import { SignInButton, SignOutButton, SignUpButton } from 'svelte-clerk';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="text-2xl font-semibold">You've been invited</h1>
	{#if data.isSignedIn}
		<p class="mt-4">Accept the invitation to finish setting up access.</p>
		<form method="POST" class="mt-6">
			<button type="submit" class="rounded border px-4 py-2">Accept invitation</button>
		</form>
		{#if form?.message}
			<p class="mt-4" role="alert">{form.message}</p>
			<div class="mt-4"><SignOutButton redirectUrl={page.url.pathname} /></div>
		{/if}
	{:else}
		<p class="mt-4">
			Create an account or sign in with the email address this invitation was sent to.
		</p>
		<div class="mt-6 flex gap-4">
			<SignUpButton forceRedirectUrl={page.url.pathname} />
			<SignInButton forceRedirectUrl={page.url.pathname} />
		</div>
	{/if}
</main>
