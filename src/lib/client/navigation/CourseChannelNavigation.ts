import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { COURSE_CHANNELS, COURSE_CHANNEL_ROUTE_IDS, type CourseChannel } from './CourseChannel.ts';
import { findNeighbor } from './ListNeighbor.ts';

/** Opens the channel `offset` steps from the current one, wrapping from the last back to the first. */
export function navigateToAdjacentCourseChannel(
	courseId: string,
	currentChannel: CourseChannel,
	offset: 1 | -1
) {
	const channel = findNeighbor(COURSE_CHANNELS, COURSE_CHANNELS.indexOf(currentChannel), offset);
	void goto(resolve(COURSE_CHANNEL_ROUTE_IDS[channel], { courseId }));
}
