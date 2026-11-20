import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { mentionService } from '#lib/server/mentions/MentionService.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = AccessGuard.requireAdmittedUser(locals);
	return { mentions: await mentionService.listMentions({}, user), loadedAt: Date.now() };
};
