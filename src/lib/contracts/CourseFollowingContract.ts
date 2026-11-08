export interface FollowedCourseResponse {
	id: string;
	code: string;
	title: string;
	institutionName: string;
}

export interface FollowedCourseListResponse {
	courses: FollowedCourseResponse[];
}

export interface FollowingStateResponse {
	isFollowed: boolean;
}
