<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { SignInButton, SignOutButton } from 'svelte-clerk';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import LanguagePicker from '#lib/components/LanguagePicker.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!--
	The sign-in design: a tinted panel with the pitch beside the sign-in panel on desktop, stacked
	on phones. Clerk's hosted page collects the email and password.
-->
<div class="min-h-dvh desktop:grid desktop:grid-cols-2">
	<section
		class="flex flex-col border-b bg-surface-container px-4 py-8 tablet:px-10 desktop:border-r desktop:border-b-0 desktop:px-16 desktop:py-12"
	>
		<p class="font-mono text-sm font-semibold text-primary">{m.app_name()}</p>
		<div class="my-auto pt-10 desktop:pt-0">
			<h1 class="max-w-xl text-headline font-bold desktop:text-[3.25rem] desktop:leading-[1.05]">
				{m.landing_headline()}
			</h1>
			<p class="mt-5 max-w-xl font-reading text-lg leading-relaxed text-body desktop:text-xl">
				{m.landing_pitch()}
			</p>
		</div>
		<p class="mt-10 hidden text-sm text-on-surface-variant desktop:block">{m.landing_footer()}</p>
	</section>

	<main class="flex flex-col px-4 py-8 tablet:px-10 desktop:px-16 desktop:py-12">
		<div class="flex justify-end"><LanguagePicker /></div>
		<div class="mx-auto my-auto w-full max-w-md py-10">
			{#if data.currentUser?.status === 'suspended'}
				<p class="text-lg">{m.landing_account_suspended()}</p>
				<SignOutButton class={buttonVariants({ variant: 'outlined', class: 'mt-6 w-full' })}
					>{m.auth_sign_out()}</SignOutButton
				>
			{:else if data.isSignedIn}
				<p class="text-lg">{m.landing_awaiting_invitation()}</p>
				<SignOutButton class={buttonVariants({ variant: 'outlined', class: 'mt-6 w-full' })}
					>{m.auth_sign_out()}</SignOutButton
				>
			{:else}
				<h2 class="text-headline font-bold">{m.landing_sign_in_heading()}</h2>
				<p class="mt-2 text-on-surface-variant">{m.landing_invitation_only()}</p>
				<SignInButton class={buttonVariants({ variant: 'filled', class: 'mt-8 w-full' })}
					>{m.auth_sign_in()}</SignInButton
				>
			{/if}
		</div>
	</main>
</div>
