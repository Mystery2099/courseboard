<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { page } from '$app/state';
	import { SignInButton, SignOutButton, SignUpButton } from 'svelte-clerk';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="text-headline font-bold">{m.invitation_heading()}</h1>
	{#if data.isSignedIn}
		<p class="mt-4">{m.invitation_accept_prompt()}</p>
		<form method="POST" class="mt-6">
			<Button type="submit">{m.invitation_accept()}</Button>
		</form>
		{#if form?.errorCode}
			<p class="mt-4" role="alert">{describeErrorCode(form.errorCode)}</p>
			<div class="mt-4">
				<SignOutButton
					redirectUrl={page.url.pathname}
					class={buttonVariants({ variant: 'outlined' })}>{m.auth_sign_out()}</SignOutButton
				>
			</div>
		{/if}
	{:else}
		<p class="mt-4">
			{m.invitation_sign_in_prompt()}
		</p>
		<div class="mt-6 flex flex-wrap gap-2">
			<SignUpButton
				forceRedirectUrl={page.url.pathname}
				class={buttonVariants({ variant: 'filled' })}>{m.auth_sign_up()}</SignUpButton
			>
			<SignInButton
				forceRedirectUrl={page.url.pathname}
				class={buttonVariants({ variant: 'outlined' })}>{m.auth_sign_in()}</SignInButton
			>
		</div>
	{/if}
</main>
