import { z } from 'zod';
import type { RequestErrorCode } from './ErrorContract.ts';

/** A MongoDB ObjectId in its 24-character hexadecimal form. */
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

/** A page's `nextCursor` when pages are ordered by date: milliseconds, then the last id. */
export const timestampIdCursorSchema = z.string().regex(/^\d{1,15}_[a-f0-9]{24}$/);

/**
 * Multi-line user text: only control characters and lone surrogates are refused, since joiners
 * (format characters) appear in emoji and in Persian and Indic text.
 */
export const MULTILINE_TEXT_PATTERN = /^(?:[^\p{Cc}\p{Cs}]|[\n\r\t])*$/u;

export interface ApiErrorResponse {
	/** `message` is English for logs and other clients; the web client shows the code's translation. */
	error: { code: RequestErrorCode; message: string };
}
