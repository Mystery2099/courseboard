import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type { PostDetailResponse } from '#lib/contracts/PostContract.ts';
import type {
	CourseReviewContextResponse,
	CreateReviewRequest,
	UpdateReviewRequest
} from '#lib/contracts/ReviewContract.ts';

export const reviewQueryKeys = {
	all: ['reviews'] as const,
	context: (courseId: string) => [...reviewQueryKeys.all, 'context', courseId] as const
};

export class ReviewApiClient {
	static getCourseContext(courseId: string): Promise<CourseReviewContextResponse> {
		return ApiRequest.get(`/api/courses/${courseId}/reviews`);
	}

	static createReview(courseId: string, request: CreateReviewRequest): Promise<PostDetailResponse> {
		return ApiRequest.post(`/api/courses/${courseId}/reviews`, request);
	}

	static updateReview(postId: string, request: UpdateReviewRequest): Promise<PostDetailResponse> {
		return ApiRequest.put(`/api/posts/${postId}/review`, request);
	}
}
