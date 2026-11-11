import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type { FollowingStateResponse } from '#lib/contracts/CourseFollowingContract.ts';

export class CourseFollowingApiClient {
	static followCourse(courseId: string): Promise<FollowingStateResponse> {
		return ApiRequest.put(`/api/courses/${courseId}/following`, {});
	}

	static async unfollowCourse(courseId: string): Promise<void> {
		await ApiRequest.delete(`/api/courses/${courseId}/following`);
	}
}
