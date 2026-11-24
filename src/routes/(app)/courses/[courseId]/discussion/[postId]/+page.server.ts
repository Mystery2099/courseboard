import { LINKED_REPLY_QUERY_PARAMETER } from '#lib/contracts/PostContract.ts';
import { CoursePostPageLoader } from '#lib/server/web/CoursePostPageLoader.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, url }) =>
	CoursePostPageLoader.loadThread(
		locals,
		params,
		'discussion',
		url.searchParams.get(LINKED_REPLY_QUERY_PARAMETER)
	);
