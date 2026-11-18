import { describe, expect, it } from 'vitest';
import { CourseActivityNotices } from './CourseActivityNotices.svelte.ts';

const courseId = '000000000000000000000003';

describe('course activity notices', () => {
	it('counts announced posts once, by kind, leaving out posts already shown', () => {
		const notices = new CourseActivityNotices();
		notices.recordPost({ courseId, postId: 'question-1', kind: 'question' });
		notices.recordPost({ courseId, postId: 'question-1', kind: 'question' });
		notices.recordPost({ courseId, postId: 'discussion-1', kind: 'discussion' });

		expect(notices.findNewPostIds(null, new Set())).toEqual(['question-1', 'discussion-1']);
		expect(notices.findNewPostIds('question', new Set())).toEqual(['question-1']);
		expect(notices.findNewPostIds(null, new Set(['question-1']))).toEqual(['discussion-1']);

		notices.forgetPosts(['question-1']);
		expect(notices.findNewPostIds('question', new Set())).toEqual([]);
	});

	it('counts announced replies for their own thread only, until cleared', () => {
		const notices = new CourseActivityNotices();
		notices.recordReply({ courseId, postId: 'thread-1', replyId: 'reply-1' });
		notices.recordReply({ courseId, postId: 'thread-2', replyId: 'reply-2' });

		expect(notices.findNewReplyIds('thread-1', new Set())).toEqual(['reply-1']);
		expect(notices.findNewReplyIds('thread-1', new Set(['reply-1']))).toEqual([]);

		notices.clear();
		expect(notices.findNewReplyIds('thread-2', new Set())).toEqual([]);
	});
});
