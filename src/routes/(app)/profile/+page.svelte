<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { resolve } from '$app/paths';
	import { useClerkContext } from 'svelte-clerk';
	import ProfileHeader from '#lib/components/profile/ProfileHeader.svelte';
	import AcademicHistorySection from '#lib/components/history/AcademicHistorySection.svelte';
	import ProfileActivitySection from '#lib/components/profile/ProfileActivitySection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const clerkContext = useClerkContext();
	const imageUrl = $derived(clerkContext.user?.hasImage ? clerkContext.user.imageUrl : null);
</script>

<svelte:head><title>{m.profile_title()}</title></svelte:head>

<!-- Desktop: an identity column beside the history, as in the profile designs. -->
<main class="desktop:grid desktop:min-h-dvh desktop:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
	<div class="desktop:border-r desktop:bg-surface-sidebar">
		<ProfileHeader
			username={data.profile.username}
			displayName={data.profile.displayName}
			{imageUrl}
			subtitle={data.profile.primaryInstitution.name}
		/>
		<div class="mx-auto max-w-3xl px-4 pt-6 desktop:px-8">
			<Button variant="outlined" class="w-full text-on-surface" href={resolve('/(app)/settings')}
				>{m.profile_edit_profile()}</Button
			>
		</div>
	</div>

	<div class="mx-auto w-full max-w-3xl px-4 py-8 desktop:mx-0 desktop:max-w-5xl desktop:px-8">
		<AcademicHistorySection
			initialHistory={data.history}
			initialHistoryLoadedAt={data.historyLoadedAt}
			username={data.profile.username}
			primaryInstitutionId={data.profile.primaryInstitution.id}
		/>
		<ProfileActivitySection />
	</div>
</main>
