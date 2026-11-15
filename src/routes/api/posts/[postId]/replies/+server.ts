import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { replyService } from '#lib/server/content/ReplyService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import { postNotFound } from '../../PostApiErrors.ts';
import type { RequestHandler } from './$types';

/** One page of the thread's replies, oldest first. */
export const GET: RequestHandler = ({ locals, params, url }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const page = await replyService.listReplies(
			params.postId,
			Object.fromEntries(url.searchParams),
			actor
		);
		return page ? json(page) : postNotFound();
	});

/** Repeating a request with the same `submissionId` returns the reply stored the first time. */
export const POST: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const result = await replyService.createReply(
			params.postId,
			await readApiJson(request),
			actor
		);
		switch (result.kind) {
			case 'created':
				return json(result.reply, { status: 201 });
			case 'post-not-found':
				return postNotFound();
			case 'post-locked':
				return apiError(409, 'post-locked', 'This thread is locked, so it has no new replies.');
			case 'parent-reply-unavailable':
				return apiError(
					409,
					'parent-reply-unavailable',
					'Reply to the post or to one of its top-level replies.'
				);
		}
	});
