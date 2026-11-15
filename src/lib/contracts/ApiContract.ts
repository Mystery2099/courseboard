import { z } from 'zod';

/** A MongoDB ObjectId in its 24-character hexadecimal form. */
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

/**
 * Multi-line user text: only control characters and lone surrogates are refused, since joiners
 * (format characters) appear in emoji and in Persian and Indic text.
 */
export const MULTILINE_TEXT_PATTERN = /^(?:[^\p{Cc}\p{Cs}]|[\n\r\t])*$/u;

export interface ApiErrorResponse {
	error: { code: string; message: string };
}
