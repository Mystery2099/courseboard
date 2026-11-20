import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type {
	ProfileActivityPageResponse,
	ProfileActivityType
} from '#lib/contracts/ProfileActivityContract.ts';

export const profileActivityQueryKeys = {
	all: ['profile-activity'] as const,
	list: (type: ProfileActivityType) => [...profileActivityQueryKeys.all, type] as const
};

export class ProfileActivityApiClient {
	static listOwnActivity(
		type: ProfileActivityType,
		after: string | null
	): Promise<ProfileActivityPageResponse> {
		const query = new URLSearchParams({ type });
		if (after) query.set('after', after);
		return ApiRequest.get(`/api/profile/activity?${query}`);
	}
}
