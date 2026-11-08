import { afterEach, describe, expect, it, vi } from 'vitest';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { GET as browseCourses } from './+server.ts';
import { PUT as followCourse } from './[courseId]/following/+server.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active'
};
const courseId = '000000000000000000000002';

function requestEvent<Event>(user: ApplicationUser | null, request: Request, signedIn = true) {
	return {
		locals: { currentUser: user, auth: () => ({ userId: signedIn ? 'identity' : null }) },
		request,
		url: new URL(request.url),
		params: { courseId }
	} as unknown as Event;
}

function followRequest() {
	return new Request(`https://example.test/api/courses/${courseId}/following`, {
		method: 'PUT',
		headers: { 'content-type': 'application/json', origin: 'https://example.test' },
		body: '{}'
	});
}

afterEach(() => vi.restoreAllMocks());

describe('course HTTP API', () => {
	it.each([
		{ user: null, signedIn: false, status: 401 },
		{ user: null, signedIn: true, status: 403 },
		{ user: { ...student, status: 'suspended' as const }, signedIn: true, status: 403 }
	])('denies course reads and follows without active admission: $status', async (scenario) => {
		const browse = vi.spyOn(courseCatalogService, 'browseCourses');
		const follow = vi.spyOn(courseFollowingService, 'followCourse');
		const browseRequest = new Request(`https://example.test/api/courses?institutionId=${courseId}`);

		const responses = await Promise.all([
			browseCourses(requestEvent(scenario.user, browseRequest, scenario.signedIn)),
			followCourse(requestEvent(scenario.user, followRequest(), scenario.signedIn))
		]);
		for (const response of responses) expect(response.status).toBe(scenario.status);
		expect(browse).not.toHaveBeenCalled();
		expect(follow).not.toHaveBeenCalled();
	});

	it('rejects a malformed institution id', async () => {
		const request = new Request('https://example.test/api/courses?institutionId=nope');
		const response = await browseCourses(requestEvent(student, request));
		expect(response.status).toBe(400);
	});

	it('follows through the same service used by web actions', async () => {
		const follow = vi
			.spyOn(courseFollowingService, 'followCourse')
			.mockResolvedValue({ isFollowed: true });
		const response = await followCourse(requestEvent(student, followRequest()));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ isFollowed: true });
		expect(follow).toHaveBeenCalledWith(courseId, student);
	});

	it('reports an unknown course', async () => {
		vi.spyOn(courseFollowingService, 'followCourse').mockResolvedValue(null);
		const response = await followCourse(requestEvent(student, followRequest()));
		expect(response.status).toBe(404);
	});
});
