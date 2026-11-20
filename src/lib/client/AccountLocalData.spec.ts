import { describe, expect, it } from 'vitest';
import { AccountLocalData } from './AccountLocalData.ts';
import { AccountLocalStorage } from './AccountLocalStorage.ts';
import { ComposerDraftTarget } from './content/ComposerDrafts.svelte.ts';

class InMemoryStorage implements Storage {
	private readonly entries = new Map<string, string>();
	get length() {
		return this.entries.size;
	}
	clear() {
		this.entries.clear();
	}
	getItem(key: string) {
		return this.entries.get(key) ?? null;
	}
	key(index: number) {
		return [...this.entries.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.entries.delete(key);
	}
	setItem(key: string, value: string) {
		this.entries.set(key, value);
	}
}

const threadTarget = ComposerDraftTarget.threadReply('post-1');
const branchTarget = ComposerDraftTarget.branchReply('post-1', 'reply-1');

function createLocalData(storage: Storage | null, accountId: { current: string | null }) {
	return new AccountLocalData(
		() => accountId.current,
		() => true,
		new AccountLocalStorage(() => storage)
	);
}

describe('account local data', () => {
	it('keeps drafts apart by account and target, shares one per target, and forgets blank ones', () => {
		const storage = new InMemoryStorage();
		const accountId = { current: 'user_a' as string | null };
		const localData = createLocalData(storage, accountId);
		localData.composerDrafts.open(threadTarget).bodyMarkdown = 'thread text';
		localData.composerDrafts.open(branchTarget).bodyMarkdown = 'branch text';
		expect(localData.composerDrafts.open(threadTarget).bodyMarkdown).toBe('thread text');

		const reopened = createLocalData(storage, accountId);
		expect(reopened.composerDrafts.open(branchTarget).bodyMarkdown).toBe('branch text');
		accountId.current = 'user_b';
		expect(reopened.composerDrafts.open(threadTarget).bodyMarkdown).toBe('');

		accountId.current = 'user_a';
		reopened.composerDrafts.open(threadTarget).bodyMarkdown = '  ';
		expect(storage.length).toBe(1);
	});

	it('clears a sent draft only while it is unchanged', () => {
		const localData = createLocalData(new InMemoryStorage(), { current: 'user_a' });
		const draft = localData.composerDrafts.open(
			ComposerDraftTarget.newPost('course-1', 'question')
		);
		draft.title = 'Title';
		draft.bodyMarkdown = 'Sent';
		draft.bodyMarkdown = 'Sent, then edited';
		draft.clearIfUnchanged({ title: 'Title', bodyMarkdown: 'Sent' });
		expect(draft.bodyMarkdown).toBe('Sent, then edited');
		draft.clearIfUnchanged({ title: 'Title', bodyMarkdown: 'Sent, then edited' });
		expect(draft.title).toBe('');
	});

	it('keeps unconfirmed replies under the account that sent them', () => {
		const storage = new InMemoryStorage();
		const accountId = { current: 'user_a' as string | null };
		const localData = createLocalData(storage, accountId);
		const sentByA = localData.unconfirmedReplies('post-1');
		sentByA.save({
			submissionId: 'submission-1',
			parentReplyId: null,
			bodyMarkdown: 'from A',
			refusalMessage: null
		});
		accountId.current = 'user_b';
		sentByA.save({
			submissionId: 'submission-2',
			parentReplyId: null,
			bodyMarkdown: 'late',
			refusalMessage: null
		});
		sentByA.remove('submission-1');

		expect(localData.unconfirmedReplies('post-1').loadAll()).toEqual([]);
		accountId.current = 'user_a';
		expect(localData.unconfirmedReplies('post-1').loadAll()).toEqual([
			{
				submissionId: 'submission-1',
				parentReplyId: null,
				bodyMarkdown: 'from A',
				refusalMessage: null
			}
		]);
		expect(localData.unconfirmedReplies('post-2').loadAll()).toEqual([]);
		sentByA.remove('submission-1');
		expect(localData.unconfirmedReplies('post-1').loadAll()).toEqual([]);
	});

	it('forgets drafts held in memory once their account signs out', () => {
		const storage = new InMemoryStorage();
		const localData = createLocalData(storage, { current: 'user_a' });
		localData.composerDrafts.open(threadTarget).bodyMarkdown = 'before sign-out';
		localData.keepOnlyAccount(null);
		expect(storage.length).toBe(0);
		expect(localData.composerDrafts.open(threadTarget).bodyMarkdown).toBe('');
	});

	it('keeps and shows a newer draft another tab saved while this one was publishing', () => {
		const storage = new InMemoryStorage();
		const target = ComposerDraftTarget.newPost('course-1', 'question');
		const publishingTab = createLocalData(storage, { current: 'user_a' }).composerDrafts.open(
			target
		);
		publishingTab.bodyMarkdown = 'Published';
		createLocalData(storage, { current: 'user_a' }).composerDrafts.open(target).bodyMarkdown =
			'Newer, from another tab';
		publishingTab.clearIfUnchanged({ title: '', bodyMarkdown: 'Published' });
		expect(publishingTab.bodyMarkdown).toBe('Newer, from another tab');
		expect(
			createLocalData(storage, { current: 'user_a' }).composerDrafts.open(target).bodyMarkdown
		).toBe('Newer, from another tab');
	});

	it("removes other accounts' data, all of it when signed out, and leaves other keys alone", () => {
		const storage = new InMemoryStorage();
		storage.setItem('unrelated', 'kept');
		const accountId = { current: 'user_a' as string | null };
		const localData = createLocalData(storage, accountId);
		for (const id of ['user_a', 'user_ab', 'user_b']) {
			accountId.current = id;
			localData.composerDrafts.open(threadTarget).bodyMarkdown = id;
		}

		localData.keepOnlyAccount('user_a');
		expect(
			createLocalData(storage, { current: 'user_a' }).composerDrafts.open(threadTarget).bodyMarkdown
		).toBe('user_a');
		expect(
			createLocalData(storage, { current: 'user_ab' }).composerDrafts.open(threadTarget)
				.bodyMarkdown
		).toBe('');

		localData.keepOnlyAccount(null);
		expect([...Array(storage.length).keys()].map((index) => storage.key(index))).toEqual([
			'unrelated'
		]);
	});

	it('keeps working from memory when storage is missing, throws, or holds something unreadable', () => {
		const throwingStorage = new InMemoryStorage();
		throwingStorage.setItem('courseboard:account:user_a:draft:reply:post-1', '{not json');
		throwingStorage.setItem = () => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		};
		const storages: Array<() => Storage | null> = [
			() => null,
			() => {
				throw new DOMException('Blocked', 'SecurityError');
			},
			() => throwingStorage
		];
		for (const resolveStorage of storages) {
			const localData = new AccountLocalData(
				() => 'user_a',
				() => true,
				new AccountLocalStorage(resolveStorage)
			);
			const draft = localData.composerDrafts.open(threadTarget);
			expect(draft.bodyMarkdown).toBe('');
			draft.bodyMarkdown = 'typed';
			expect(localData.composerDrafts.open(threadTarget).bodyMarkdown).toBe('typed');
			expect(() => localData.keepOnlyAccount(null)).not.toThrow();
			expect(localData.unconfirmedReplies('post-1').loadAll()).toEqual([]);
		}
	});
});
