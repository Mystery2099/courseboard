import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	AccessGuard.requireAdmittedUser(locals);
};
