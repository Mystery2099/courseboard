import { ObjectId } from 'mongodb';
import {
	MENTIONS_PER_BODY_LIMIT,
	mentionListQuerySchema,
	type MentionListResponse
} from '#lib/contracts/MentionContract.ts';
import type { MentionCreatedEvent } from '#lib/contracts/RealtimeContract.ts';
import { MarkdownRenderer } from '#lib/markdown/MarkdownRenderer.ts';
import { AccessPolicy } from '#lib/server/access/AccessPolicy.ts';
import { FixedWindowRateLimiter } from '#lib/server/limits/FixedWindowRateLimiter.ts';
import { DatabaseIndexInitializer } from '#lib/server/persistence/DatabaseIndexInitializer.ts';
import {
	contentEventPublisher,
	type ContentEventPublisher
} from '#lib/server/realtime/ContentEventPublisher.ts';
import { SearchSnippet } from '#lib/server/search/SearchSnippet.ts';
import type { ApplicationUser, OnboardedUser } from '#lib/server/users/ApplicationUser.ts';
import {
	applicationUserRepository,
	type ApplicationUserRepository
} from '#lib/server/users/ApplicationUserRepository.ts';
import type { MentionedUser } from './MentionedUser.ts';
import { mentionRepository, type MentionRepository } from './MentionRepository.ts';

const HOUR_MILLISECONDS = 60 * 60 * 1000;

/** The limits that keep mentions from being used to flood someone. */
export interface MentionRateLimiters {
	/** Mentions one author can store, across everyone. */
	byAuthor: FixedWindowRateLimiter;
	/** Mentions one author can store of one person. */
	byAuthorAndRecipient: FixedWindowRateLimiter;
	/** Live notices one author can send one person. */
	noticesByAuthorAndRecipient: FixedWindowRateLimiter;
}

/**
 * Decides who a post or reply mentions, tells them if they're connected, and lists their mentions.
 * Every admitted, active account can read every course, so anyone active and onboarded can be
 * mentioned. A mention that isn't allowed stays plain text; it never refuses the post or reply,
 * so a reply queued offline can't fail because of one.
 */
export class MentionService {
	private static readonly PAGE_SIZE = 20;
	/** Bounds the account lookup for a body full of handles; only the first ten kept are stored. */
	private static readonly LOOKUP_LIMIT = 50;

	constructor(
		private readonly users: ApplicationUserRepository,
		private readonly mentions: MentionRepository,
		private readonly events: ContentEventPublisher,
		private readonly limiters: MentionRateLimiters
	) {}

	static createDefaultRateLimiters(): MentionRateLimiters {
		return {
			byAuthor: new FixedWindowRateLimiter(30, HOUR_MILLISECONDS),
			byAuthorAndRecipient: new FixedWindowRateLimiter(5, HOUR_MILLISECONDS),
			noticesByAuthorAndRecipient: new FixedWindowRateLimiter(1, 10 * 60 * 1000)
		};
	}

	/**
	 * The people `bodyMarkdown` mentions who can be mentioned, in the order written. Counts each one
	 * against the author's limits, so call it once per new post or reply, before storing it.
	 */
	async resolveMentions(bodyMarkdown: string, author: OnboardedUser): Promise<MentionedUser[]> {
		const usernames = MarkdownRenderer.toMentionedUsernames(bodyMarkdown)
			.filter((username) => username !== author.profile.username)
			.slice(0, MentionService.LOOKUP_LIMIT);
		const accounts = await this.users.findMentionableByUsernames(usernames);
		const idsByUsername = new Map(accounts.map((account) => [account.username, account._id]));

		const mentioned: MentionedUser[] = [];
		for (const username of usernames) {
			if (mentioned.length === MENTIONS_PER_BODY_LIMIT) break;
			const userId = idsByUsername.get(username);
			if (!userId) continue;
			if (!this.limiters.byAuthor.hasCapacity(author.id)) break;
			if (!this.limiters.byAuthorAndRecipient.tryAcquire(`${author.id}:${userId.toHexString()}`)) {
				continue;
			}
			this.limiters.byAuthor.tryAcquire(author.id);
			mentioned.push({ userId, username });
		}
		return mentioned;
	}

	/** Call only after the post or reply was first stored, never for a retried submission. */
	announceMentions(mentioned: MentionedUser[], event: MentionCreatedEvent, authorId: string): void {
		for (const { userId } of mentioned) {
			const recipientId = userId.toHexString();
			if (this.limiters.noticesByAuthorAndRecipient.tryAcquire(`${authorId}:${recipientId}`)) {
				this.events.publishMentionCreated(event, recipientId);
			}
		}
	}

	async listMentions(query: unknown, actor: ApplicationUser | null): Promise<MentionListResponse> {
		const user = AccessPolicy.requireOnboardedUser(actor);
		const { after } = mentionListQuerySchema.parse(query);
		await DatabaseIndexInitializer.ensureIndexes();
		const pageSize = MentionService.PAGE_SIZE;
		const rows = await this.mentions.findPage(
			new ObjectId(user.id),
			after ? MentionService.parseCursor(after) : null,
			pageSize + 1
		);
		const page = rows.slice(0, pageSize);
		const lastRow = page.at(-1);
		return {
			mentions: page.map((row) => ({
				id: row._id.toHexString(),
				courseId: row.courseId.toHexString(),
				courseCode: row.courseCode,
				postId: row.postId.toHexString(),
				replyId: row.replyId?.toHexString() ?? null,
				postKind: row.postKind,
				postTitle: row.postTitle,
				author: row.author,
				excerpt: SearchSnippet.around(row.bodyMarkdown, `@${user.profile.username}`),
				createdAt: row.createdAt.toISOString()
			})),
			nextCursor:
				lastRow && rows.length > pageSize
					? `${lastRow.createdAt.getTime()}_${lastRow._id.toHexString()}`
					: null
		};
	}

	private static parseCursor(cursor: string) {
		const [createdAtMilliseconds, id] = cursor.split('_');
		return { createdAt: new Date(Number(createdAtMilliseconds)), id: new ObjectId(id) };
	}
}

export const mentionService = new MentionService(
	applicationUserRepository,
	mentionRepository,
	contentEventPublisher,
	MentionService.createDefaultRateLimiters()
);
