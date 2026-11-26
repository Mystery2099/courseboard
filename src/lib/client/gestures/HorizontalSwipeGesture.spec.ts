import { describe, expect, it } from 'vitest';
import { classifySwipe } from './HorizontalSwipeGesture.ts';

describe('classifySwipe', () => {
	it('reports the direction of a long, mostly sideways touch', () => {
		expect(classifySwipe(-60, 10)).toBe('left');
		expect(classifySwipe(60, -10)).toBe('right');
	});

	it('ignores short touches, which stay taps', () => {
		expect(classifySwipe(-43, 0)).toBeNull();
	});

	it('ignores diagonal and vertical drags, which belong to scrolling', () => {
		expect(classifySwipe(60, 41)).toBeNull();
		expect(classifySwipe(10, 120)).toBeNull();
	});
});
