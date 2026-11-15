<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { page } from '$app/state';
	import { SignInButton, SignOutButton, SignUpButton } from 'svelte-clerk';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="text-2xl font-semibold">{m.invitation_heading()}</h1>
	{#if data.isSignedIn}
		<p class="mt-4">{m.invitation_accept_prompt()}</p>
		<form method="POST" class="mt-6">
			<button type="submit" class="rounded border px-4 py-2">{m.invitation_accept()}</button>
		</form>
		{#if form?.errorCode}
			<p class="mt-4" role="alert">{describeErrorCode(form.errorCode)}</p>
			<div class="mt-4"><SignOutButton redirectUrl={page.url.pathname} /></div>
		{/if}
	{:else}
		<p class="mt-4">
			{m.invitation_sign_in_prompt()}
		</p>
		<div class="mt-6 flex gap-4">
			<SignUpButton forceRedirectUrl={page.url.pathname} />
			<SignInButton forceRedirectUrl={page.url.pathname} />
		</div>
	{/if}
</main>
