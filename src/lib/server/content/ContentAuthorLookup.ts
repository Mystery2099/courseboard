import type { Document } from 'mongodb';
import { USERS_COLLECTION_NAME } from '#lib/server/users/ApplicationUser.ts';

/**
 * Aggregation stages that replace `authorId` lookups with an `author` of username and display name
 * only, so no other account field can reach a post or reply response.
 */
export const CONTENT_AUTHOR_LOOKUP_STAGES: Document[] = [
	{
		$lookup: {
			from: USERS_COLLECTION_NAME,
			localField: 'authorId',
			foreignField: '_id',
			as: 'author',
			pipeline: [{ $project: { _id: 0, username: 1, displayName: 1 } }]
		}
	},
	{ $unwind: '$author' }
];
