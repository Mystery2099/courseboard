import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type { MentionListResponse } from '#lib/contracts/MentionContract.ts';
import type { PersonSearchResult, SearchResponse } from '#lib/contracts/SearchContract.ts';

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

	/**
	 * People whose username or display name starts with `prefix`, from people search across every
	 * school, with username matches first.
	 */
	static async suggestPeople(prefix: string): Promise<PersonSearchResult[]> {
		const query = new URLSearchParams({ scope: 'people', institutionId: '', q: prefix });
		const response = await ApiRequest.get<SearchResponse>(`/api/search?${query}`);
		const people = response.people?.results ?? [];
		const startsWithPrefix = (person: PersonSearchResult) => person.username.startsWith(prefix);
		return [
			...people.filter(startsWithPrefix),
			...people.filter((person) => !startsWithPrefix(person))
		];
	}
}
