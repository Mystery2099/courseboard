import { describe, expect, it } from 'vitest';
import { ComposerDraftStorage, ComposerDraftTarget } from './ComposerDraftStorage.ts';

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
const reply = (bodyMarkdown: string) => ({ title: '', bodyMarkdown });

describe('composer draft storage', () => {
	it('keeps drafts apart by account and target, and forgets blank ones', () => {
		const storage = new InMemoryStorage();
		const draftStorage = new ComposerDraftStorage(() => storage);
		draftStorage.write('user_a', threadTarget, reply('thread text'));
		draftStorage.write('user_a', branchTarget, reply('branch text'));

		expect(draftStorage.read('user_a', threadTarget)).toEqual(reply('thread text'));
		expect(draftStorage.read('user_a', branchTarget)).toEqual(reply('branch text'));
		expect(draftStorage.read('user_b', threadTarget)).toBeNull();

		draftStorage.write('user_a', threadTarget, reply('  '));
		expect(draftStorage.read('user_a', threadTarget)).toBeNull();
	});

	it('keeps unsent text only when nothing newer is saved, and forgets it only while unchanged', () => {
		const storage = new InMemoryStorage();
		const draftStorage = new ComposerDraftStorage(() => storage);
		draftStorage.write('user_a', threadTarget, reply('newer'));
		draftStorage.writeIfAbsent('user_a', threadTarget, reply('failed'));
		expect(draftStorage.read('user_a', threadTarget)).toEqual(reply('newer'));

		draftStorage.removeIfUnchanged('user_a', threadTarget, reply('failed'));
		expect(draftStorage.read('user_a', threadTarget)).toEqual(reply('newer'));
		draftStorage.removeIfUnchanged('user_a', threadTarget, reply('newer'));
		expect(draftStorage.read('user_a', threadTarget)).toBeNull();
	});

	it("removes other accounts' drafts, all of them when signed out, and leaves other keys alone", () => {
		const storage = new InMemoryStorage();
		storage.setItem('unrelated', 'kept');
		const draftStorage = new ComposerDraftStorage(() => storage);
		draftStorage.write('user_a', threadTarget, reply('mine'));
		draftStorage.write('user_ab', threadTarget, reply('similar id'));
		draftStorage.write('user_b', threadTarget, reply('theirs'));

		draftStorage.removeAllExcept('user_a');
		expect(draftStorage.read('user_a', threadTarget)).toEqual(reply('mine'));
		expect(draftStorage.read('user_ab', threadTarget)).toBeNull();
		expect(draftStorage.read('user_b', threadTarget)).toBeNull();

		draftStorage.removeAllExcept(null);
		expect(draftStorage.read('user_a', threadTarget)).toBeNull();
		expect(storage.getItem('unrelated')).toBe('kept');
	});

	it('degrades quietly when storage is missing, throws, or holds something unreadable', () => {
		const throwingStorage = new InMemoryStorage();
		throwingStorage.setItem = () => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		};
		throwingStorage.getItem = () => '{not json';
		const draftStorages = [
			new ComposerDraftStorage(() => null),
			new ComposerDraftStorage(() => {
				throw new DOMException('Blocked', 'SecurityError');
			}),
			new ComposerDraftStorage(() => throwingStorage)
		];
		for (const draftStorage of draftStorages) {
			expect(() => draftStorage.write('user_a', threadTarget, reply('text'))).not.toThrow();
			expect(draftStorage.read('user_a', threadTarget)).toBeNull();
			expect(() => draftStorage.removeAllExcept(null)).not.toThrow();
		}
	});
});
