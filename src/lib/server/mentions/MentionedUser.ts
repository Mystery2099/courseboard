import type { ObjectId } from 'mongodb';

/**
 * Someone a post or reply mentions, stored on that post or reply. The username is kept beside the
 * ID so rendering needs no lookup; usernames can't be changed.
 */
export interface MentionedUser {
	userId: ObjectId;
	username: string;
}
