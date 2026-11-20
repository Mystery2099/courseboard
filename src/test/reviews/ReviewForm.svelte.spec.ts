import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../routes/layout.css';
import { ApiRequestError } from '#lib/client/ApiRequest.ts';
import { ReviewApiClient } from '#lib/client/content/ReviewApiClient.ts';
import { PostApiClient } from '#lib/client/content/PostApiClient.ts';
import type { PostDetailResponse } from '#lib/contracts/PostContract.ts';
import ReviewFormTestHarness from './ReviewFormTestHarness.svelte';

const review: PostDetailResponse = {
	id: '000000000000000000000004',
	courseId: '000000000000000000000002',
	kind: 'review',
	title: 'A useful course',
	bodyMarkdown: 'Start the project early.',
	mentionedUsernames: [],
	author: { username: 'student', displayName: 'Student' },
	createdAt: '2026-11-14T12:00:00.000Z',
	lastActivityAt: '2026-11-14T12:00:00.000Z',
	replyCount: 0,
	acceptedReplyId: null,
	hasAcceptedReply: false,
	isLocked: false,
	reviewData: {
		status: 'taking',
		term: { season: 'fall', year: 2026 },
		workload: 4,
		wouldTakeAgain: false
	},
	viewerPermissions: { canChooseAcceptedReply: false, canLock: false, canEditReview: true }
};

afterEach(() => vi.restoreAllMocks());

it('expands the composer, requires disclosure, retains a failed review, and refreshes the list after retry', async () => {
	await page.viewport(360, 640);
	const createReview = vi
		.spyOn(ReviewApiClient, 'createReview')
		.mockRejectedValueOnce(new ApiRequestError(503, 'unavailable', 'Try again.'))
		.mockResolvedValue(review);
	vi.spyOn(ReviewApiClient, 'getCourseContext')
		.mockResolvedValueOnce({
			statistics: { reviewCount: 0, averageWorkload: null, wouldTakeAgainPercentage: null },
			ownReviewId: null,
			attempts: [
				{ id: '000000000000000000000003', status: 'taking', term: { season: 'fall', year: 2026 } }
			]
		})
		.mockResolvedValue({
			statistics: { reviewCount: 1, averageWorkload: 4, wouldTakeAgainPercentage: 0 },
			ownReviewId: review.id,
			attempts: []
		});
	vi.spyOn(PostApiClient, 'listPosts').mockResolvedValue({ posts: [review], nextCursor: null });
	const screen = await render(ReviewFormTestHarness, { showChannel: true, onSaved: vi.fn() });
	expect(
		screen
			.getByText('Write a review', { exact: true })
			.element()
			.parentElement?.hasAttribute('open')
	).toBe(false);
	await screen.getByText('Write a review', { exact: true }).click();
	await screen.getByRole('textbox', { name: 'Title', exact: true }).fill(review.title);
	await screen.getByRole('textbox', { name: 'Your review' }).fill(review.bodyMarkdown);
	await screen.getByRole('combobox', { name: 'Workload', exact: true }).selectOptions('4');
	await screen.getByRole('combobox', { name: 'Would you take it again?' }).selectOptions('false');
	await screen.getByRole('button', { name: 'Publish review' }).click();
	await expect
		.element(screen.getByText('Confirm that you understand what publishing shares.'))
		.toBeVisible();
	expect(createReview).not.toHaveBeenCalled();
	await screen.getByRole('checkbox', { name: 'I understand what publishing shares.' }).click();
	await screen.getByRole('button', { name: 'Publish review' }).click();
	await expect
		.element(screen.getByRole('alert'))
		.toHaveTextContent("Couldn't reach the server. Check your connection and try again.");
	await expect
		.element(screen.getByRole('textbox', { name: 'Your review' }))
		.toHaveValue(review.bodyMarkdown);
	expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
	await screen.getByRole('button', { name: 'Publish review' }).click();
	await expect
		.element(screen.getByText('Your review was published.', { exact: false }))
		.toBeVisible();
	await expect
		.element(screen.getByRole('link', { name: 'Open or edit your review' }))
		.toBeVisible();
	await expect.element(screen.getByRole('link', { name: /A useful course/ })).toBeVisible();
	expect(createReview).toHaveBeenCalledTimes(2);
	expect(createReview.mock.calls[0]).toEqual(createReview.mock.calls[1]);
	expect(createReview).toHaveBeenLastCalledWith(review.courseId, {
		historyEntryId: '000000000000000000000003',
		acknowledgedStatus: 'taking',
		acknowledgedTerm: { season: 'fall', year: 2026 },
		disclosureAcknowledged: true,
		title: review.title,
		bodyMarkdown: review.bodyMarkdown,
		workload: 4,
		wouldTakeAgain: false
	});
});

it('edits feedback and ratings without offering changes to the participation snapshot', async () => {
	await page.viewport(728, 900);
	const updateReview = vi.spyOn(ReviewApiClient, 'updateReview').mockResolvedValue(review);
	const screen = await render(ReviewFormTestHarness, { editedReview: review, onSaved: vi.fn() });
	await expect.element(screen.getByText(/term stay fixed/)).toBeVisible();
	expect(screen.getByRole('combobox', { name: 'Reviewing this attempt' }).elements()).toHaveLength(
		0
	);
	await screen.getByRole('textbox', { name: 'Your review' }).fill('Updated feedback.');
	await screen.getByRole('button', { name: 'Save changes' }).click();
	await expect.poll(() => updateReview.mock.calls.length).toBe(1);
	expect(updateReview).toHaveBeenCalledWith(review.id, {
		title: review.title,
		bodyMarkdown: 'Updated feedback.',
		workload: 4,
		wouldTakeAgain: false
	});
});

it('clears the acknowledgement when the chosen entry changes or disappears', async () => {
	const firstAttempt = {
		id: '000000000000000000000003',
		status: 'taking' as const,
		term: { season: 'fall' as const, year: 2026 }
	};
	const secondAttempt = { ...firstAttempt, id: '000000000000000000000005' };
	const screen = await render(ReviewFormTestHarness, {
		attempts: [firstAttempt, secondAttempt],
		onSaved: vi.fn()
	});
	const acknowledgement = screen.getByRole('checkbox', {
		name: 'I understand what publishing shares.'
	});

	await acknowledgement.click();
	await screen.rerender({ attempts: [{ ...firstAttempt }, secondAttempt] });
	await expect.element(acknowledgement).toBeChecked();

	await screen.rerender({
		attempts: [{ ...firstAttempt, term: { season: 'spring', year: 2026 } }, secondAttempt]
	});
	await expect.element(acknowledgement).not.toBeChecked();

	await acknowledgement.click();
	await screen.rerender({ attempts: [secondAttempt] });
	await expect.element(acknowledgement).not.toBeChecked();
	await expect
		.element(screen.getByRole('combobox', { name: 'Reviewing this attempt' }))
		.toHaveValue(secondAttempt.id);
});
