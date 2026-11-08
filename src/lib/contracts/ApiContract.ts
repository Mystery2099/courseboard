import { z } from 'zod';

/** A MongoDB ObjectId in its 24-character hexadecimal form. */
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

export interface ApiErrorResponse {
	error: { code: string; message: string };
}
