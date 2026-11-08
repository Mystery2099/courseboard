import { resolve } from '$app/paths';

/** The fixed views of every course space, in display order. */
export const COURSE_CHANNELS = ['overview', 'questions', 'reviews', 'discussion'] as const;

export type CourseChannel = (typeof COURSE_CHANNELS)[number];

export const COURSE_CHANNEL_LABELS: Record<CourseChannel, string> = {
	overview: 'Overview',
	questions: 'Questions',
	reviews: 'Reviews',
	discussion: 'Discussion'
};

export function courseChannelHref(courseId: string, channel: CourseChannel): string {
	switch (channel) {
		case 'overview':
			return resolve('/(app)/courses/[courseId]', { courseId });
		case 'questions':
			return resolve('/(app)/courses/[courseId]/questions', { courseId });
		case 'reviews':
			return resolve('/(app)/courses/[courseId]/reviews', { courseId });
		case 'discussion':
			return resolve('/(app)/courses/[courseId]/discussion', { courseId });
	}
}

/** The channel a route belongs to, or null outside a course space. */
export function findCourseChannel(routeId: string | null): CourseChannel | null {
	if (!routeId?.startsWith('/(app)/courses/[courseId]')) return null;
	const channel = routeId.split('/').at(-1);
	return COURSE_CHANNELS.find((candidate) => candidate === channel) ?? 'overview';
}
