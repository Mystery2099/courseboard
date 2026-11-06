import { defineEnvVars } from '@sveltejs/kit/env';
import { clerkEnvVars } from 'svelte-clerk/env';
import { z } from 'zod';

/**
 * Every environment variable the application reads. SvelteKit 3 validates these at startup
 * and exposes them through `$app/env/private` and `$app/env/public`.
 */
export const variables = defineEnvVars({
	...clerkEnvVars(),
	MONGODB_URI: {
		schema: z.string().startsWith('mongodb'),
		description: 'MongoDB Atlas connection string, including credentials.'
	},
	MONGODB_DATABASE_NAME: {
		schema: z.string().min(1).default('academic_platform'),
		description: 'Name of the MongoDB database that holds application collections.'
	},
	BOOTSTRAP_ADMINISTRATOR_CLERK_USER_ID: {
		schema: z.string().startsWith('user_').optional(),
		description: 'Clerk user ID that is admitted as the first administrator without an invitation.'
	}
});
