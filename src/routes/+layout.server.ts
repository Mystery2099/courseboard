import { buildClerkProps } from 'svelte-clerk/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user = locals.currentUser;
	return {
		...buildClerkProps(locals.auth()),
		currentUser: user ? { role: user.role, status: user.status } : null
	};
};
