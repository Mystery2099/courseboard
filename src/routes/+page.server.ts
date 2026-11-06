import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.currentUser?.status === 'active') redirect(303, '/explore');
	return { isSignedIn: locals.auth().userId !== null };
};
