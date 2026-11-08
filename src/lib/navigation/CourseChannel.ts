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

/** The channel a route belongs to, or null outside a course space. */
export function findCourseChannel(routeId: string | null): CourseChannel | null {
	if (!routeId?.startsWith(COURSE_CHANNEL_ROUTE_IDS.overview)) return null;
	const channel = routeId.split('/').at(-1);
	return COURSE_CHANNELS.find((candidate) => candidate === channel) ?? 'overview';
}
