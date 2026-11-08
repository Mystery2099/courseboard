import { afterEach, describe, expect, it, vi } from 'vitest';
import { courseFollowingService } from '#lib/server/catalog/CourseFollowingService.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { courseFollowingFormActions } from './CourseFollowingFormActions.ts';

const student: ApplicationUser = {
	id: '000000000000000000000001',
	clerkUserId: 'student',
	role: 'member',
	status: 'active',
	profile: null
};
const courseId = '000000000000000000000002';

type FollowEvent = Parameters<typeof courseFollowingFormActions.follow>[0];

afterEach(() => vi.restoreAllMocks());

describe('course following form actions', () => {
	it('follows the course named by the route, even with an empty form body', async () => {
		const follow = vi
			.spyOn(courseFollowingService, 'followCourse')
			.mockResolvedValue({ isFollowed: true });
		const event = {
			locals: { currentUser: student },
			params: { courseId },
			request: new Request('https://example.test', { method: 'POST', body: new FormData() })
		} as unknown as FollowEvent;

		expect(await courseFollowingFormActions.follow(event)).toBeUndefined();
		expect(follow).toHaveBeenCalledWith(courseId, student);
	});
});
