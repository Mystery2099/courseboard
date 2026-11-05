<script lang="ts">
	import { Show, SignInButton, UserButton } from 'svelte-clerk';
</script>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="text-2xl font-semibold">Academic Discussion Platform</h1>
	<p class="mt-2 text-sm opacity-70">
		Scaffold placeholder. Course spaces, history, and reviews are not built yet.
	</p>
	<div class="mt-6">
		<Show when="signed-out"><SignInButton /></Show>
		<Show when="signed-in"><UserButton /></Show>
	</div>
</main>
