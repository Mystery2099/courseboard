import { expect, it, vi } from 'vitest';
import { MongoClient, ObjectId } from 'mongodb';
import type { HistoryStatus, HistoryVisibility } from '#lib/contracts/AcademicHistoryContract.ts';
import { mongoClientProvider } from '#lib/server/persistence/MongoClientProvider.ts';
import { peopleSearchRepository, type PeopleSearchCriteria } from './PeopleSearchRepository.ts';

const testMongoDbUri = process.env.TEST_MONGODB_URI;

/** Opt in against a throwaway local MongoDB, never the application's configured database. */
it.skipIf(!testMongoDbUri)(
	'keeps private entries, hidden schools, and unlisted accounts out of people search',
	async () => {
		if (!testMongoDbUri || !/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(testMongoDbUri)) {
			throw new Error('TEST_MONGODB_URI must point to a local 127.0.0.1 port.');
		}
		const client = new MongoClient(testMongoDbUri);
		const database = client.db(`people_search_verification_${new ObjectId().toHexString()}`);
		vi.spyOn(mongoClientProvider, 'getDatabase').mockReturnValue(database);
		try {
			await client.connect();
			await peopleSearchRepository.ensureIndexes();
			const schoolId = new ObjectId();
			const courseId = new ObjectId();
			await database.collection('institutions').insertOne({ _id: schoolId, name: 'Alfred State' });
			await database.collection('courses').insertOne({ _id: courseId, code: 'CISY 7013' });

			const addUser = async (username: string | null, account: Record<string, unknown> = {}) => {
				const userId = new ObjectId();
				await database.collection('users').insertOne({
					_id: userId,
					status: 'active',
					primaryInstitutionId: schoolId,
					...(username && { username, displayName: `${username} Student` }),
					...account
				});
				return userId;
			};
			const addEntry = (userId: ObjectId, status: HistoryStatus, visibility: HistoryVisibility) =>
				database.collection('academicHistories').insertOne({
					userId,
					courseId,
					status,
					term: { season: 'fall', year: 2026 },
					visibility,
					privateNote: 'never returned'
				});

			const open = await addUser('open');
			await addEntry(open, 'took', 'visible');
			await addEntry(open, 'taking', 'private');
			await addEntry(await addUser('secretive'), 'taking', 'private');
			await addUser('hidden_school', { primaryInstitutionHidden: true });
			await addEntry(
				await addUser('hidden_with_entry', { primaryInstitutionHidden: true }),
				'planning',
				'visible'
			);
			await addEntry(await addUser('suspended', { status: 'suspended' }), 'took', 'visible');
			await addEntry(await addUser(null), 'took', 'visible');

			const everyone: PeopleSearchCriteria = {
				name: '',
				institutionId: null,
				institutionCourseIds: [],
				courseId: null,
				status: null
			};
			const atSchool = { ...everyone, institutionId: schoolId, institutionCourseIds: [courseId] };
			const usernames = async (criteria: PeopleSearchCriteria) =>
				(await peopleSearchRepository.search(criteria, 0, 20)).map((person) => person.username);

			// A private entry never matches a course or status filter.
			expect(await usernames({ ...atSchool, courseId, status: 'taking' })).toEqual([]);
			expect(await usernames({ ...everyone, status: 'taking' })).toEqual([]);
			expect(await usernames({ ...atSchool, courseId })).toEqual(['hidden_with_entry', 'open']);

			// A hidden primary school matches only through a visible entry, and is never named.
			const peopleAtSchool = await peopleSearchRepository.search(atSchool, 0, 20);
			expect(peopleAtSchool).toEqual([
				{
					username: 'hidden_with_entry',
					displayName: 'hidden_with_entry Student',
					primaryInstitutionName: null,
					matchedEntries: [
						{ courseCode: 'CISY 7013', status: 'planning', term: { season: 'fall', year: 2026 } }
					]
				},
				{
					username: 'open',
					displayName: 'open Student',
					primaryInstitutionName: 'Alfred State',
					matchedEntries: [
						{ courseCode: 'CISY 7013', status: 'took', term: { season: 'fall', year: 2026 } }
					]
				},
				{
					username: 'secretive',
					displayName: 'secretive Student',
					primaryInstitutionName: 'Alfred State',
					matchedEntries: []
				}
			]);

			// Suspended and not-yet-onboarded accounts are never listed, even by name.
			expect(await usernames({ ...everyone, name: 'susp' })).toEqual([]);
			expect(await usernames({ ...everyone, name: 'HIDDEN' })).toEqual([
				'hidden_school',
				'hidden_with_entry'
			]);

			const queryPlan = await database
				.collection('academicHistories')
				.find({ courseId, visibility: 'visible', status: 'took' })
				.explain();
			expect(JSON.stringify(queryPlan.queryPlanner.winningPlan)).toContain(
				'courseId_1_visibility_1_status_1'
			);
		} finally {
			await database.dropDatabase();
			await client.close();
			vi.restoreAllMocks();
		}
	},
	30_000
);
