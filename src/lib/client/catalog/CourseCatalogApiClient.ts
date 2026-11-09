import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type {
	CourseBrowseResponse,
	InstitutionListResponse
} from '#lib/contracts/CourseCatalogContract.ts';

export const courseCatalogQueryKeys = {
	institutions: () => ['catalog', 'institutions'] as const,
	courses: (institutionId: string) => ['catalog', 'courses', institutionId] as const
};

export class CourseCatalogApiClient {
	static listInstitutions(): Promise<InstitutionListResponse> {
		return ApiRequest.get('/api/institutions');
	}

	static browseCourses(institutionId: string, after: string | null): Promise<CourseBrowseResponse> {
		const query = new URLSearchParams({ institutionId });
		if (after) query.set('after', after);
		return ApiRequest.get(`/api/courses?${query}`);
	}
}
