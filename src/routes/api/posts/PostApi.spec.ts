import { afterEach, describe, expect, it, vi } from 'vitest';
import { postService } from '#lib/server/content/PostService.ts';
import { replyService } from '#lib/server/content/ReplyService.ts';
import { reviewService } from '#lib/server/content/ReviewService.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { GET as listPosts, POST as createPost } from '../courses/[courseId]/posts/+server.ts';
import { GET as getPost } from './[postId]/+server.ts';
import { PUT as chooseAcceptedReply } from './[postId]/accepted-reply/+server.ts';
import { PUT as lockPost } from './[postId]/lock/+server.ts';
import { GET as listReplies, POST as createReply } from './[postId]/replies/+server.ts';
import { GET as getReviewContext, POST as createReview } from '../courses/[courseId]/reviews/+server.ts';
import { PUT as updateReview } from './[postId]/review/+server.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: null
};
const courseId = '000000000000000000000002';
const postId = '000000000000000000000003';
const origin = 'https://example.test';

function requestEvent<Event>(user: ApplicationUser | null, request: Request, signedIn = true) {
	return {
		locals: { currentUser: user, auth: () => ({ userId: signedIn ? 'identity' : null }) },
		request,
		url: new URL(request.url),
		params: { courseId, postId }
	} as unknown as Event;
}

function jsonRequest(method: string, path: string, body: unknown, requestOrigin = origin) {
	return new Request(`${origin}${path}`, {
		method,
		headers: { 'content-type': 'application/json', origin: requestOrigin },
		body: JSON.stringify(body)
	});
}

afterEach(() => vi.restoreAllMocks());

describe('post HTTP API', () => {
	it.each([
		{ user: null, signedIn: false, status: 401 },
		{ user: null, signedIn: true, status: 403 },
		{ user: { ...student, status: 'suspended' as const }, signedIn: true, status: 403 }
	])('denies thread reads and writes without active admission: $status', async (scenario) => {
		const serviceCalls = [
			vi.spyOn(postService, 'listPosts'),
			vi.spyOn(postService, 'getPost'),
			vi.spyOn(postService, 'createPost'),
			vi.spyOn(postService, 'chooseAcceptedReply'),
			vi.spyOn(replyService, 'listReplies'),
			vi.spyOn(replyService, 'createReply'),
			vi.spyOn(reviewService, 'getCourseContext'),
			vi.spyOn(reviewService, 'createReview'),
			vi.spyOn(reviewService, 'updateReview')
		];
		const { user, signedIn } = scenario;
		const read = <Event>(path: string) =>
			requestEvent<Event>(user, new Request(`${origin}${path}`), signedIn);
		const write = <Event>(method: string, path: string) =>
			requestEvent<Event>(user, jsonRequest(method, path, {}), signedIn);

		const responses = await Promise.all([
			listPosts(read(`/api/courses/${courseId}/posts`)),
			getPost(read(`/api/posts/${postId}`)),
			listReplies(read(`/api/posts/${postId}/replies`)),
			createPost(write('POST', `/api/courses/${courseId}/posts`)),
			createReply(write('POST', `/api/posts/${postId}/replies`)),
			chooseAcceptedReply(write('PUT', `/api/posts/${postId}/accepted-reply`)),
			getReviewContext(read(`/api/courses/${courseId}/reviews`)),
			createReview(write('POST', `/api/courses/${courseId}/reviews`)),
			updateReview(write('PUT', `/api/posts/${postId}/review`))
		]);

		for (const response of responses) expect(response.status).toBe(scenario.status);
		for (const serviceCall of serviceCalls) expect(serviceCall).not.toHaveBeenCalled();
	});

	it('refuses a lock from a member and a reply from another origin', async () => {
		const setLocked = vi.spyOn(postService, 'setLocked');
		const createStoredReply = vi.spyOn(replyService, 'createReply');

		const lock = await lockPost(
			requestEvent(student, jsonRequest('PUT', `/api/posts/${postId}/lock`, {}))
		);
		const crossOriginReply = await createReply(
			requestEvent(
				student,
				jsonRequest('POST', `/api/posts/${postId}/replies`, {}, 'https://elsewhere.test')
			)
		);

		expect(lock.status).toBe(403);
		expect(crossOriginReply.status).toBe(403);
		expect(setLocked).not.toHaveBeenCalled();
		expect(createStoredReply).not.toHaveBeenCalled();
	});

	it('reports a locked thread and an unfinished profile as conflicts', async () => {
		vi.spyOn(replyService, 'createReply').mockResolvedValue({ kind: 'post-locked' });
		const reply = { bodyMarkdown: 'Late.', submissionId: '4d6c1b0e-8a55-4a0c-9d2c-5c1c7f3b2a10' };

		const locked = await createReply(
			requestEvent(student, jsonRequest('POST', `/api/posts/${postId}/replies`, reply))
		);
		vi.restoreAllMocks();
		const notOnboarded = await createPost(
			requestEvent(
				student,
				jsonRequest('POST', `/api/courses/${courseId}/posts`, {
					kind: 'question',
					title: 'Which lab comes first?',
					bodyMarkdown: 'The syllabus lists two.'
				})
			)
		);

		expect(locked.status).toBe(409);
		expect((await locked.json()).error.code).toBe('post-locked');
		expect(notOnboarded.status).toBe(409);
		expect((await notOnboarded.json()).error.code).toBe('onboarding-required');
	});

	it('rejects cross-origin review writes before calling the service', async () => {
		const createStoredReview = vi.spyOn(reviewService, 'createReview');
		const updateStoredReview = vi.spyOn(reviewService, 'updateReview');
		const responses = await Promise.all([
			createReview(requestEvent(student, jsonRequest('POST', `/api/courses/${courseId}/reviews`, {}, 'https://elsewhere.test'))),
			updateReview(requestEvent(student, jsonRequest('PUT', `/api/posts/${postId}/review`, {}, 'https://elsewhere.test')))
		]);
		for (const response of responses) expect(response.status).toBe(403);
		expect(createStoredReview).not.toHaveBeenCalled();
		expect(updateStoredReview).not.toHaveBeenCalled();
	});

	it.each(['history-required', 'review-exists'] as const)('reports %s as a conflict', async (kind) => {
		vi.spyOn(reviewService, 'createReview').mockResolvedValue({ kind });
		const response = await createReview(
			requestEvent(student, jsonRequest('POST', `/api/courses/${courseId}/reviews`, {}))
		);
		expect(response.status).toBe(409);
		expect((await response.json()).error.code).toBe(kind);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});
