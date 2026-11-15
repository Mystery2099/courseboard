<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Dialog } from 'bits-ui';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import X from 'lucide-svelte/icons/x';
	import { z } from 'zod';
	import { ApiRequestError } from '#lib/client/ApiRequest.ts';
	import { PostApiClient, postQueryKeys } from '#lib/client/content/PostApiClient.ts';
	import {
		POST_BODY_MAX_LENGTH,
		POST_TITLE_MAX_LENGTH,
		createPostSchema,
		type CreatePostRequest,
		type PostDetailResponse,
		type ThreadKind
	} from '#lib/contracts/PostContract.ts';

	let {
		open = $bindable(false),
		courseId,
		kind,
		onCreated
	}: {
		open?: boolean;
		courseId: string;
		kind: ThreadKind;
		onCreated: (post: PostDetailResponse) => void;
	} = $props();

	const queryClient = useQueryClient();
	let title = $state('');
	let bodyMarkdown = $state('');
	let fieldErrors = $state<{ title?: string; bodyMarkdown?: string }>({});

	const publishMutation = createMutation(() => ({
		mutationFn: (request: CreatePostRequest) => PostApiClient.createPost(courseId, request),
		onSuccess: async (post) => {
			await queryClient.invalidateQueries({ queryKey: postQueryKeys.lists(courseId) });
			title = '';
			bodyMarkdown = '';
			open = false;
			onCreated(post);
		}
	}));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const parsed = createPostSchema.safeParse({ kind, title, bodyMarkdown });
		if (!parsed.success) {
			const errors = z.flattenError(parsed.error).fieldErrors;
			fieldErrors = { title: errors.title?.[0], bodyMarkdown: errors.bodyMarkdown?.[0] };
			return;
		}
		fieldErrors = {};
		publishMutation.mutate(parsed.data);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-slate-900/40" />
		<Dialog.Content
			class="fixed inset-0 z-50 overflow-y-auto bg-white p-4 tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-[90dvh] tablet:w-[40rem] tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-[24px] tablet:p-6 tablet:shadow-xl"
		>
			<div class="mb-4 flex items-center gap-3">
				<Dialog.Close class="-ml-2 rounded-full p-2" aria-label={m.common_close()}
					><X size={22} /></Dialog.Close
				>
				<Dialog.Title class="text-xl font-semibold">
					{kind === 'question'
						? m.post_composer_ask_question()
						: m.post_composer_start_discussion()}
				</Dialog.Title>
			</div>
			<Dialog.Description class="sr-only">
				{m.post_composer_description()}
			</Dialog.Description>
			<form class="flex flex-col gap-5" onsubmit={submit} novalidate>
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold">{m.common_title()}</span>
					<input
						type="text"
						class="rounded-2xl border-slate-300 px-4 py-2"
						bind:value={title}
						maxlength={POST_TITLE_MAX_LENGTH}
						aria-invalid={fieldErrors.title ? 'true' : undefined}
					/>
					{#if fieldErrors.title}
						<span class="text-sm text-red-700" role="alert">{fieldErrors.title}</span>
					{/if}
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold">
						{kind === 'question'
							? m.post_composer_question_body()
							: m.post_composer_discussion_body()}
					</span>
					<textarea
						class="min-h-48 rounded-2xl border-slate-300 px-4 py-2"
						bind:value={bodyMarkdown}
						maxlength={POST_BODY_MAX_LENGTH}
						aria-invalid={fieldErrors.bodyMarkdown ? 'true' : undefined}></textarea>
					{#if fieldErrors.bodyMarkdown}
						<span class="text-sm text-red-700" role="alert">{fieldErrors.bodyMarkdown}</span>
					{/if}
				</label>
				{#if publishMutation.error}
					<p class="text-sm text-red-700" role="alert">
						{publishMutation.error instanceof ApiRequestError
							? publishMutation.error.message
							: m.post_composer_publish_failed()}
					</p>
				{/if}
				<div class="flex gap-2">
					<button
						type="submit"
						class="rounded-full bg-blue-700 px-5 py-2 font-semibold text-white disabled:opacity-50"
						disabled={publishMutation.isPending}
						>{publishMutation.isPending
							? m.post_composer_posting()
							: m.post_composer_post()}</button
					>
					<Dialog.Close class="rounded-full border px-5 py-2">{m.common_cancel()}</Dialog.Close>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
