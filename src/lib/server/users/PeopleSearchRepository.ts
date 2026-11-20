import type { Collection, Document, ObjectId } from 'mongodb';
import type { AcademicTerm, HistoryStatus } from '#lib/contracts/AcademicHistoryContract.ts';
import { COURSES_COLLECTION_NAME } from '#lib/server/catalog/Course.ts';
import { INSTITUTIONS_COLLECTION_NAME } from '#lib/server/catalog/Institution.ts';
import {
	ACADEMIC_HISTORIES_COLLECTION_NAME,
	type AcademicHistoryEntryDocument
} from '#lib/server/history/AcademicHistoryEntry.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { USERS_COLLECTION_NAME, type ApplicationUserDocument } from './ApplicationUser.ts';

export interface PeopleSearchCriteria {
	/** Matches a username prefix or the start of a word in the display name. */
	name: string;
	/** Limits matches to this school: a visible primary school or a visible entry there. */
	institutionId: ObjectId | null;
	/** That school's course IDs, required when `institutionId` is set. */
	institutionCourseIds: ObjectId[];
	courseId: ObjectId | null;
	status: HistoryStatus | null;
}

export interface MatchedEntryRow {
	courseCode: string;
	status: HistoryStatus;
	term: AcademicTerm | null;
}

export interface MentionSuggestionRow {
	username: string;
	displayName: string;
}

export interface PersonSearchRow {
	username: string;
	displayName: string;
	primaryInstitutionName: string | null;
	matchedEntries: MatchedEntryRow[];
}

/**
 * People filtering for the lab's user-filtering requirement. Every stage that reads academic
 * history starts with `visibility: 'visible'`, so a private entry can't match a filter, be counted,
 * or appear in a result. Results carry public profile fields only.
 */
export class PeopleSearchRepository {
	private static readonly MATCHED_ENTRY_LIMIT = 3;

	private histories(): Collection<AcademicHistoryEntryDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<AcademicHistoryEntryDocument>(ACADEMIC_HISTORIES_COLLECTION_NAME);
	}

	private users(): Collection<ApplicationUserDocument> {
		return mongoClientProvider
			.getDatabase()
			.collection<ApplicationUserDocument>(USERS_COLLECTION_NAME);
	}

	async ensureIndexes(): Promise<void> {
		await this.histories().createIndex({ courseId: 1, visibility: 1, status: 1 });
		// A status filter across every school has no course to start from.
		await this.histories().createIndex({ visibility: 1, status: 1 });
	}

	search(criteria: PeopleSearchCriteria, skip: number, limit: number): Promise<PersonSearchRow[]> {
		return criteria.courseId || criteria.status
			? this.searchByVisibleEntries(criteria, skip, limit)
			: this.searchByProfile(criteria, skip, limit);
	}

	/**
	 * People to offer for an `@` mention typed as `prefix`, other than `excludedUserId`. Username
	 * matches come first, then display-name matches, each ordered by display name.
	 */
	findMentionSuggestions(
		prefix: string,
		excludedUserId: ObjectId,
		limit: number
	): Promise<MentionSuggestionRow[]> {
		return this.users()
			.aggregate<MentionSuggestionRow>([
				{
					$match: {
						...PeopleSearchRepository.listedUserFilter(prefix),
						_id: { $ne: excludedUserId }
					}
				},
				{
					$set: {
						usernameMatches: {
							$regexMatch: {
								input: '$username',
								regex: `^${PeopleSearchRepository.escapeRegex(prefix.toLowerCase())}`
							}
						}
					}
				},
				{ $sort: { usernameMatches: -1, displayName: 1, _id: 1 } },
				{ $limit: limit },
				{ $project: { _id: 0, username: 1, displayName: 1 } }
			])
			.toArray();
	}

	/** Course or status filters: start from visible entries, then find their owners. */
	private searchByVisibleEntries(
		criteria: PeopleSearchCriteria,
		skip: number,
		limit: number
	): Promise<PersonSearchRow[]> {
		const courseFilter = criteria.courseId
			? { courseId: criteria.courseId }
			: criteria.institutionId
				? { courseId: { $in: criteria.institutionCourseIds } }
				: {};
		return this.histories()
			.aggregate<PersonSearchRow>([
				{
					$match: {
						visibility: 'visible',
						...courseFilter,
						...(criteria.status && { status: criteria.status })
					}
				},
				...PeopleSearchRepository.entryCourseCodeStages(),
				{
					$group: {
						_id: '$userId',
						matchedEntries: {
							$firstN: {
								n: PeopleSearchRepository.MATCHED_ENTRY_LIMIT,
								input: { courseCode: '$courseCode', status: '$status', term: '$term' }
							}
						}
					}
				},
				{
					$lookup: {
						from: USERS_COLLECTION_NAME,
						localField: '_id',
						foreignField: '_id',
						as: 'user',
						pipeline: [{ $match: PeopleSearchRepository.listedUserFilter(criteria.name) }]
					}
				},
				{ $unwind: '$user' },
				{
					$project: {
						_id: '$user._id',
						username: '$user.username',
						displayName: '$user.displayName',
						primaryInstitutionId: '$user.primaryInstitutionId',
						primaryInstitutionHidden: '$user.primaryInstitutionHidden',
						matchedEntries: 1
					}
				},
				...PeopleSearchRepository.pageAndResultStages(skip, limit)
			])
			.toArray();
	}

	/** Name or school filters only: start from profiles, attaching visible entries at the school. */
	private searchByProfile(
		criteria: PeopleSearchCriteria,
		skip: number,
		limit: number
	): Promise<PersonSearchRow[]> {
		const schoolStages: Document[] = criteria.institutionId
			? [
					{
						$lookup: {
							from: ACADEMIC_HISTORIES_COLLECTION_NAME,
							localField: '_id',
							foreignField: 'userId',
							as: 'matchedEntries',
							pipeline: [
								{
									$match: {
										visibility: 'visible',
										courseId: { $in: criteria.institutionCourseIds }
									}
								},
								{ $limit: PeopleSearchRepository.MATCHED_ENTRY_LIMIT },
								...PeopleSearchRepository.entryCourseCodeStages(),
								{ $project: { _id: 0, courseCode: 1, status: 1, term: 1 } }
							]
						}
					},
					{
						$match: {
							$or: [
								{
									primaryInstitutionId: criteria.institutionId,
									primaryInstitutionHidden: { $ne: true }
								},
								{ 'matchedEntries.0': { $exists: true } }
							]
						}
					}
				]
			: [{ $set: { matchedEntries: [] } }];
		return this.users()
			.aggregate<PersonSearchRow>([
				{ $match: PeopleSearchRepository.listedUserFilter(criteria.name) },
				...schoolStages,
				...PeopleSearchRepository.pageAndResultStages(skip, limit)
			])
			.toArray();
	}

	/** Active, onboarded accounts, optionally narrowed by name. */
	private static listedUserFilter(name: string): Document {
		const filter: Document = { status: 'active', username: { $exists: true } };
		if (!name) return filter;
		const escaped = PeopleSearchRepository.escapeRegex(name);
		return {
			...filter,
			$or: [
				{ username: { $regex: `^${escaped.toLowerCase()}` } },
				{ displayName: { $regex: `(^|[\\s-])${escaped}`, $options: 'i' } }
			]
		};
	}

	private static escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/** Replaces an entry's `courseId` with the course code, for showing the matched entry. */
	private static entryCourseCodeStages(): Document[] {
		return [
			{
				$lookup: {
					from: COURSES_COLLECTION_NAME,
					localField: 'courseId',
					foreignField: '_id',
					as: 'course',
					pipeline: [{ $project: { _id: 0, code: 1 } }]
				}
			},
			{ $unwind: '$course' },
			{ $set: { courseCode: '$course.code' } }
		];
	}

	/** Orders by display name, pages, and keeps only public fields. A hidden school stays hidden. */
	private static pageAndResultStages(skip: number, limit: number): Document[] {
		return [
			{ $sort: { displayName: 1, _id: 1 } },
			{ $skip: skip },
			{ $limit: limit },
			{
				$lookup: {
					from: INSTITUTIONS_COLLECTION_NAME,
					localField: 'primaryInstitutionId',
					foreignField: '_id',
					as: 'primaryInstitution',
					pipeline: [{ $project: { _id: 0, name: 1 } }]
				}
			},
			{
				$project: {
					_id: 0,
					username: 1,
					displayName: 1,
					primaryInstitutionName: {
						$cond: [
							{ $eq: ['$primaryInstitutionHidden', true] },
							null,
							{ $ifNull: [{ $first: '$primaryInstitution.name' }, null] }
						]
					},
					matchedEntries: 1
				}
			}
		];
	}
}

export const peopleSearchRepository = new PeopleSearchRepository();
