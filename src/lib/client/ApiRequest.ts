import type { ApiErrorResponse } from '#lib/contracts/ApiContract.ts';

export class ApiRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string
	) {
		super(message);
	}
}

/** Same-origin JSON requests to the HTTP API, turning error responses into `ApiRequestError`. */
export class ApiRequest {
	static get<Response>(path: string): Promise<Response> {
		return ApiRequest.send<Response>('GET', path);
	}

	static post<Response>(path: string, body: unknown): Promise<Response> {
		return ApiRequest.send<Response>('POST', path, body);
	}

	static put<Response>(path: string, body: unknown): Promise<Response> {
		return ApiRequest.send<Response>('PUT', path, body);
	}

	static async delete(path: string): Promise<void> {
		await ApiRequest.send<void>('DELETE', path);
	}

	private static async send<Response>(
		method: string,
		path: string,
		body?: unknown
	): Promise<Response> {
		const response = await fetch(path, {
			method,
			headers: body === undefined ? undefined : { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (!response.ok) throw await ApiRequest.toError(response);
		return (response.status === 204 ? undefined : await response.json()) as Response;
	}

	private static async toError(response: Response): Promise<ApiRequestError> {
		try {
			const { error } = (await response.json()) as ApiErrorResponse;
			return new ApiRequestError(response.status, error.code, error.message);
		} catch {
			return new ApiRequestError(response.status, 'unavailable', 'Something went wrong. Try again.');
		}
	}
}
