import { ObjectId } from 'mongodb';
import {
	MENTION_SUGGESTION_LIMIT,
	mentionSuggestionQuerySchema,
	type MentionSuggestionListResponse
} from '#lib/contracts/MentionContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import {
	peopleSearchRepository,
	type PeopleSearchRepository
} from '#lib/server/users/PeopleSearchRepository.ts';

/** Offers people to mention while an `@` is typed. Only active, onboarded accounts are offered. */
export class MentionSuggestionService {
	constructor(private readonly people: PeopleSearchRepository) {}

	async suggestPeople(
		query: unknown,
		actor: ApplicationUser | null
	): Promise<MentionSuggestionListResponse> {
		const user = AccessPolicy.requireOnboardedUser(actor);
		const { prefix } = mentionSuggestionQuerySchema.parse(query);
		// The server never keeps a mention of the author, so the author isn't offered.
		const suggestions = await this.people.findMentionSuggestions(
			prefix,
			new ObjectId(user.id),
			MENTION_SUGGESTION_LIMIT
		);
		return { suggestions };
	}
}

export const mentionSuggestionService = new MentionSuggestionService(peopleSearchRepository);
