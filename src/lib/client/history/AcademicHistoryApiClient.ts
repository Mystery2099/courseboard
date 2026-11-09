import { ApiRequest } from '#lib/client/ApiRequest.ts';
import type {
	CreateHistoryEntryRequest,
	OwnHistoryEntryResponse,
	OwnHistoryResponse,
	UpdateHistoryEntryRequest,
	VisibleHistoryResponse
} from '#lib/contracts/AcademicHistoryContract.ts';

/**
 * Query keys for history data. Every key starts with `academic-history`, so a write can invalidate
 * the owner's list and the Preview as others list together.
 */
export const academicHistoryQueryKeys = {
	all: ['academic-history'] as const,
	own: () => [...academicHistoryQueryKeys.all, 'own'] as const,
	visible: (username: string) => [...academicHistoryQueryKeys.all, 'visible', username] as const
};

export class AcademicHistoryApiClient {
	static listOwnEntries(): Promise<OwnHistoryResponse> {
		return ApiRequest.get('/api/history');
	}

	static listVisibleEntries(username: string): Promise<VisibleHistoryResponse> {
		return ApiRequest.get(`/api/users/${encodeURIComponent(username)}/history`);
	}

	static createEntry(request: CreateHistoryEntryRequest): Promise<OwnHistoryEntryResponse> {
		return ApiRequest.post('/api/history', request);
	}

	static updateEntry(
		entryId: string,
		request: UpdateHistoryEntryRequest
	): Promise<OwnHistoryEntryResponse> {
		return ApiRequest.put(`/api/history/${entryId}`, request);
	}

	static deleteEntry(entryId: string): Promise<void> {
		return ApiRequest.delete(`/api/history/${entryId}`);
	}
}
