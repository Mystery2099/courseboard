import type { PostKind } from '#lib/contracts/PostContract.ts';

/** The fixed views of every course space, in display order. */
export const COURSE_CHANNELS = ['overview', 'questions', 'reviews', 'discussion'] as const;

export type CourseChannel = (typeof COURSE_CHANNELS)[number];

export const COURSE_CHANNEL_LABELS: Record<CourseChannel, string> = {
	overview: 'Overview',
	questions: 'Questions',
	reviews: 'Reviews',
	discussion: 'Discussion'
};

/** Route ids to pass to `resolve()` together with `{ courseId }`. */
export const COURSE_CHANNEL_ROUTE_IDS = {
	overview: '/(app)/courses/[courseId]',
	questions: '/(app)/courses/[courseId]/questions',
	reviews: '/(app)/courses/[courseId]/reviews',
	discussion: '/(app)/courses/[courseId]/discussion'
} as const satisfies Record<CourseChannel, string>;

/** Thread pages live under the channel of their kind. */
export const THREAD_ROUTE_IDS = {
	question: '/(app)/courses/[courseId]/questions/[postId]',
	discussion: '/(app)/courses/[courseId]/discussion/[postId]',
	review: '/(app)/courses/[courseId]/reviews/[postId]'
} as const satisfies Record<PostKind, string>;

/** The channel a route belongs to, or null outside a course space. */
export function findCourseChannel(routeId: string | null): CourseChannel | null {
	if (!routeId?.startsWith(COURSE_CHANNEL_ROUTE_IDS.overview)) return null;
	const channel = routeId.slice(COURSE_CHANNEL_ROUTE_IDS.overview.length).split('/')[1];
	return COURSE_CHANNELS.find((candidate) => candidate === channel) ?? 'overview';
}
