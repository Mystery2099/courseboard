import type { DemoCatalogLoadResponse } from '#lib/contracts/CourseCatalogContract.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import type { ApplicationUser } from '#lib/server/users/ApplicationUser.ts';
import { courseCatalogService, type CourseCatalogService } from './CourseCatalogService.ts';
import { DEMO_CATALOG } from './DemoCatalogData.ts';

/**
 * Loads the fictional demo catalog through the regular catalog service, so seeded courses get their
 * spaces exactly like any other course. Safe to repeat: existing entries are left unchanged. It is
 * an administrator action rather than a script because the hosting plan offers no shell.
 */
export class DemoCatalogLoader {
	constructor(private readonly catalog: CourseCatalogService) {}

	async loadDemoCatalog(actor: ApplicationUser | null): Promise<DemoCatalogLoadResponse> {
		const administrator = AccessPolicy.requireAdministrator(actor);
		let institutionsCreated = 0;
		let coursesCreated = 0;
		for (const demoInstitution of DEMO_CATALOG) {
			const institution = await this.catalog.createInstitution(
				demoInstitution.institutionName,
				administrator
			);
			if (institution.created) institutionsCreated++;
			for (const demoCourse of demoInstitution.courses) {
				const course = await this.catalog.createCourse(
					{ institutionId: institution.id, ...demoCourse },
					administrator
				);
				if (course.created) coursesCreated++;
			}
		}
		return { institutionsCreated, coursesCreated };
	}
}

export const demoCatalogLoader = new DemoCatalogLoader(courseCatalogService);
