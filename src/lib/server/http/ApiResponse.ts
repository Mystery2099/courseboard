import { json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '#lib/contracts/ApiContract.ts';
import type { RequestErrorCode } from '#lib/contracts/ErrorContract.ts';
import { AccessDeniedError, AccessPolicy } from '#lib/server/access/AccessPolicy.ts';

const ACCESS_DENIED_STATUSES: Partial<Record<AccessDeniedError['code'], number>> = {
	unauthenticated: 401,
	'onboarding-required': 409
};

export function apiError(status: number, code: RequestErrorCode, message: string): Response {
	const body: ApiErrorResponse = { error: { code, message } };
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/** Keeps expected service failures in the API contract without exposing unexpected errors. */
export async function apiResponse(operation: () => Promise<Response>): Promise<Response> {
	try {
		const response = await operation();
		response.headers.set('cache-control', 'no-store');
		return response;
	} catch (cause) {
		if (cause instanceof ApiInputError) {
			return apiError(cause.status, 'invalid-input', cause.message);
		}
		if (cause instanceof AccessDeniedError) {
			return apiError(ACCESS_DENIED_STATUSES[cause.code] ?? 403, cause.code, cause.message);
		}
		if (cause instanceof ZodError) {
			return apiError(400, 'invalid-input', 'Check the supplied request details.');
		}
		console.error('Unexpected API failure:', cause);
		return apiError(500, 'internal-error', 'The request could not be completed.');
	}
}

export function requireApiIdentity(locals: App.Locals): string {
	return AccessPolicy.requireIdentity(locals.auth().userId);
}

/** No cross-origin cookie API is enabled, so writes from another origin are rejected. */
export function requireSameOriginWrite(request: Request): void {
	const origin = request.headers.get('origin');
	if (origin && origin !== new URL(request.url).origin) {
		throw new ApiInputError(403, 'Cross-origin writes are not allowed.');
	}
}

/** JSON-only writes reject browser form submissions. */
export async function readApiJson(request: Request): Promise<unknown> {
	requireSameOriginWrite(request);
	if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
		throw new ApiInputError(415, 'Use application/json.');
	}
	try {
		return await request.json();
	} catch {
		throw new ApiInputError(400, 'Supply a valid JSON body.');
	}
}

export class ApiInputError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}
