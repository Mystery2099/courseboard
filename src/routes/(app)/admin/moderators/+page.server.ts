import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { toValidationCode, type ErrorCode } from '#lib/contracts/ErrorContract.ts';
import {
	assignModeratorSchema,
	moderatorAssignmentIdSchema
} from '#lib/contracts/ModeratorAssignmentContract.ts';
import { AccessGuard } from '#lib/server/access/AccessGuard.ts';
import { courseCatalogService } from '#lib/server/catalog/CourseCatalogService.ts';
import { courseModeratorService } from '#lib/server/moderation/CourseModeratorService.ts';
import type { Actions, PageServerLoad } from './$types';

const removeAssignmentSchema = z.object({ assignmentId: moderatorAssignmentIdSchema });

export const load: PageServerLoad = async ({ locals }) => {
	const administrator = AccessGuard.requireAdministrator(locals);
	const [catalog, moderators] = await Promise.all([
		courseCatalogService.listCatalogCourses(administrator),
		courseModeratorService.listAssignments(administrator)
	]);
	return { courses: catalog.courses, ...moderators };
};

export const actions: Actions = {
	assign: async ({ locals, request }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		const formData = Object.fromEntries(await request.formData());
		const parsed = assignModeratorSchema.safeParse(formData);
		if (!parsed.success) {
			const assignError: ErrorCode =
				toValidationCode(parsed.error.issues[0]?.message) ?? 'invalid-input';
			return fail(400, { assignError, username: String(formData.username ?? '') });
		}

		const result = await courseModeratorService.assignModerator(parsed.data, administrator);
		if (result.kind !== 'assigned') {
			return fail(404, { assignError: result.kind, username: parsed.data.username });
		}
		return { assignedModerator: result.assignment };
	},
	remove: async ({ locals, request }) => {
		const administrator = AccessGuard.requireAdministrator(locals);
		const parsed = removeAssignmentSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { removeError: 'invalid-input' satisfies ErrorCode });

		if (!(await courseModeratorService.removeAssignment(parsed.data.assignmentId, administrator))) {
			return fail(404, { removeError: 'moderator-assignment-not-found' satisfies ErrorCode });
		}
	}
};
