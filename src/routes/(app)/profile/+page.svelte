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

<!--
	One column like other people's profiles, widening at 1280px so history and activity sit side by side
	instead of leaving the sides empty.
-->
<main class="mx-auto max-w-3xl pb-8 wide:max-w-7xl">
	<ProfileHeader
		username={data.profile.username}
		displayName={data.profile.displayName}
		{imageUrl}
		subtitle={data.profile.primaryInstitution.name}
	>
		{#snippet actions()}
			<Button
				variant="outlined"
				size="compact"
				class="text-on-surface"
				href={resolve('/(app)/settings')}>{m.profile_edit_profile()}</Button
			>
		{/snippet}
	</ProfileHeader>

	<div
		class="px-4 pt-6 desktop:px-8 wide:grid wide:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] wide:items-start wide:gap-8"
	>
		<AcademicHistorySection
			initialHistory={data.history}
			initialHistoryLoadedAt={data.historyLoadedAt}
			username={data.profile.username}
			primaryInstitutionId={data.profile.primaryInstitution.id}
		/>
		<ProfileActivitySection />
	</div>
</main>
