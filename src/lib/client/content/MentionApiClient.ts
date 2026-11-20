import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type {
	MentionListResponse,
	MentionSuggestionListResponse,
	MentionSuggestionResponse
} from '#lib/contracts/MentionContract.ts';

export const mentionQueryKeys = {
	all: ['mentions'] as const,
	list: () => [...mentionQueryKeys.all, 'list'] as const,
	suggestions: (prefix: string) => [...mentionQueryKeys.all, 'suggestions', prefix] as const
};

export class MentionApiClient {
	static listMentions(after: string | null): Promise<MentionListResponse> {
		const query = after ? `?${new URLSearchParams({ after })}` : '';
		return ApiRequest.get(`/api/mentions${query}`);
	}

	/** People to mention whose username or display name starts with `prefix`, username matches first. */
	static async suggestPeople(prefix: string): Promise<MentionSuggestionResponse[]> {
		const query = new URLSearchParams({ prefix });
		const response = await ApiRequest.get<MentionSuggestionListResponse>(
			`/api/mentions/suggestions?${query}`
		);
		return response.suggestions;
	}
}
