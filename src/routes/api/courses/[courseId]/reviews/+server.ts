import { json } from '@sveltejs/kit';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { reviewService } from '#lib/server/content/ReviewService.ts';
import {
	apiError,
	apiResponse,
	readApiJson,
	requireApiIdentity
} from '#lib/server/http/ApiResponse.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const context = await reviewService.getCourseContext(params.courseId, actor);
		return context
			? json(context)
			: apiError(404, 'course-not-found', 'This course does not exist.');
	});

export const POST: RequestHandler = ({ locals, params, request }) =>
	apiResponse(async () => {
		requireApiIdentity(locals);
		const actor = AccessPolicy.requireAdmittedUser(locals.currentUser);
		const result = await reviewService.createReview(
			params.courseId,
			await readApiJson(request),
			actor
		);
		switch (result.kind) {
			case 'created':
				return json(result.post, { status: 201 });
			case 'course-not-found':
				return apiError(404, result.kind, 'This course does not exist.');
			case 'history-required':
				return apiError(
					409,
					result.kind,
					'Choose a Taking or Took entry for this course. Your history may have changed.'
				);
			case 'review-exists':
				return apiError(
					409,
					result.kind,
					'You already have a review for this course. Edit it instead.'
				);
		}
	});
