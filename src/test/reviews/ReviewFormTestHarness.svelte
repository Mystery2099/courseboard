<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import ReviewForm from '#lib/components/content/ReviewForm.svelte';
	import ReviewChannelView from '#lib/components/content/ReviewChannelView.svelte';
	import type { PostDetailResponse } from '#lib/contracts/PostContract.ts';

	let {
		editedReview = null,
		showChannel = false,
		onSaved
	}: {
		editedReview?: PostDetailResponse | null;
		showChannel?: boolean;
		onSaved: (post: PostDetailResponse) => void;
	} = $props();

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: 60_000 }, mutations: { retry: false } }
	});
	const attempts = [
		{
			id: '000000000000000000000003',
			status: 'taking' as const,
			term: { season: 'fall' as const, year: 2026 }
		}
	];
</script>

<QueryClientProvider client={queryClient}>
	{#if showChannel}
		<ReviewChannelView
			course={{
				id: '000000000000000000000002',
				code: 'CISY 8503',
				title: 'Applied Database Management',
				institution: { id: '000000000000000000000009', name: 'Alfred State' }
			}}
			initialPage={{ posts: [], nextCursor: null }}
			initialContext={{
				statistics: { reviewCount: 0, averageWorkload: null, wouldTakeAgainPercentage: null },
				ownReviewId: null,
				attempts
			}}
			initialLoadedAt={Date.now()}
		/>
	{:else}
		<ReviewForm
			courseId="000000000000000000000002"
			{attempts}
			{editedReview}
			{onSaved}
			onCancel={() => undefined}
		/>
	{/if}
</QueryClientProvider>
