<script lang="ts">
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { Dialog } from 'bits-ui';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import X from 'lucide-svelte/icons/x';
	import { describeFieldIssues, describeRequestFailure } from '#lib/client/ErrorPresentation.ts';
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
			fieldErrors = describeFieldIssues(parsed.error);
			return;
		}
		fieldErrors = {};
		publishMutation.mutate(parsed.data);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-scrim" />
		<Dialog.Content
			class="fixed inset-0 z-50 overflow-y-auto bg-surface p-4 tablet:inset-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-[90dvh] tablet:w-[40rem] tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-sheet tablet:p-6 tablet:shadow-dialog"
		>
			<div class="mb-4 flex items-center gap-3">
				<Dialog.Close
					class={[buttonVariants({ variant: 'ghost', size: 'icon' }), '-ml-2']}
					aria-label={m.common_close()}><X size={22} /></Dialog.Close
				>
				<Dialog.Title class="text-xl font-bold">
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
						class="rounded-field border-outline px-4 py-2"
						bind:value={title}
						maxlength={POST_TITLE_MAX_LENGTH}
						aria-invalid={fieldErrors.title ? 'true' : undefined}
					/>
					{#if fieldErrors.title}
						<span class="text-sm text-error" role="alert">{fieldErrors.title}</span>
					{/if}
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold">
						{kind === 'question'
							? m.post_composer_question_body()
							: m.post_composer_discussion_body()}
					</span>
					<textarea
						class="min-h-48 rounded-field border-outline px-4 py-2"
						bind:value={bodyMarkdown}
						maxlength={POST_BODY_MAX_LENGTH}
						aria-invalid={fieldErrors.bodyMarkdown ? 'true' : undefined}></textarea>
					{#if fieldErrors.bodyMarkdown}
						<span class="text-sm text-error" role="alert">{fieldErrors.bodyMarkdown}</span>
					{/if}
				</label>
				{#if publishMutation.error}
					<p class="text-sm text-error" role="alert">
						{describeRequestFailure(publishMutation.error, m.post_composer_publish_failed)}
					</p>
				{/if}
				<div class="flex gap-2">
					<Button variant="filled" type="submit" disabled={publishMutation.isPending}
						>{publishMutation.isPending
							? m.post_composer_posting()
							: m.post_composer_post()}</Button
					>
					<Dialog.Close class={buttonVariants({ variant: 'outlined' })}
						>{m.common_cancel()}</Dialog.Close
					>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
