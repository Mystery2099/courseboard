import { ApiRequest } from '#lib/client/ApiRequest.ts';

export class CourseNavigationApiClient {
	/** Records the course as the last visited one, which sign-in resumes. */
	static async recordVisit(courseId: string): Promise<void> {
		await ApiRequest.put(`/api/courses/${courseId}/visit`, {});
	}
}
