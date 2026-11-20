/** Socket.IO room names. Clients never name rooms; the server derives them from checked IDs. */
export class RealtimeRooms {
	private static readonly COURSE_PREFIX = 'course:';

	/** Receives a course space's events. A socket is in at most one course room. */
	static forCourse(courseId: string): string {
		return `${RealtimeRooms.COURSE_PREFIX}${courseId}`;
	}

	/**
	 * Every socket of one account, so an author's own tabs can be left out of their events and a
	 * mention reaches the person whatever course they have open.
	 */
	static forUser(userId: string): string {
		return `user:${userId}`;
	}

	static isCourseRoom(room: string): boolean {
		return room.startsWith(RealtimeRooms.COURSE_PREFIX);
	}
}
