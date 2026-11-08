# Academic course platform

**Status:** Confirmed assignment scope, November 5, 2026. Professor Enke approved the proposal on November 4, 2026, expects WebSockets, and treats Markdown support as a given. Implementation remains unverified. The [decision register](../planning/decision-register.md) records the reasoning and the remaining open questions.

## Access and accounts

Use Clerk through community-maintained `svelte-clerk`, initially with email/password and required email verification. MFA is deferred because production Clerk MFA requires a paid plan. Google login remains undecided.

Application access requires an individual, single-use invitation stored in MongoDB. Invitations match an independently verified Clerk email, expire after seven days, and can be revoked and replaced. An admin screen produces copyable links for manual delivery. Redeem atomically. A forwarded invitation alone cannot prove email ownership. After admission, verified email changes preserve access through the same Clerk user ID, and roles and suspension stay tied to that identity.

The sign-in page briefly explains what the platform is for and that access is by invitation, since logged-out visitors can't see anything else. An authenticated account without admission cannot access academic content. Bootstrap the first administrator using my explicitly configured Clerk user ID. Invitations create regular users. Only existing admins grant elevated permissions.

Onboarding requires username, display name, and primary institution. History and course following are optional. Use initials with consistent generated colors for avatars; defer avatar uploads and require neither a photo nor a bio. Users have a unique username and an editable display name. Username changes are deferred. Email addresses stay private. Prepare separate fictional user, moderator, and admin demonstration accounts, and invite the professor to create his own account.

## Courses and navigation

Admins manage institutions and courses. Demo data centers on Alfred State College, alongside fictional schools; people and posts stay fictional. Each course belongs to an institution and automatically gets one canonical discussion space. Course codes alone are not globally unique. Defer student course creation, course requests, and catalog imports.

Each course has Overview, Questions, Reviews, and Discussion. Overview combines activity from the other views and has no separate post type. Defer configurable channels and general communities.

After sign-in, resume the last accessible course or open Explore. New users start with discovery. Followed courses are navigation shortcuts, independent of academic history. Defer the standalone Home feed and cross-course unread counters.

Discovery defaults to the primary institution but allows other institutions. Admitted users can read, ask, discuss, and reply without following a course or claiming attendance.

Discussion lists default to newest activity, with Newest and Unanswered filters for questions. Replies remain chronological. Thread activity advances only on creation and new replies, not edits, moderation actions, or accepted-answer changes.

## Histories and profiles

History entries are self-reported Planning, Taking, or Took records. Support repeated attempts with independent terms, statuses, and visibility. Terms use season and year; Planning may omit a term.

Entries start Private. Visible on profile exposes permitted course, status, and term fields to other admitted users. Private notes stay private. Grade entry and storage are deferred. Own profiles include all entries and a Preview as others option.

Other profiles group visible entries by institution and term and show course and status. Profiles with no visible entries show a neutral empty state that doesn't reveal whether private entries exist.

Users can hide their primary institution from profiles and other users' institution filters while retaining it privately for discovery defaults. Show other institutions only when they have visible history entries.

## Privacy and permissions

I'd rather be overly careful here than discover we've accidentally leaked somebody's information. These boundaries need to hold **in the database queries and server responses**, not just on the screen.

**Following a course**, **academic history**, and **published content** are separate records. Following means someone wants the course in their navigation. History means they personally recorded a relationship to a course. Published content is what they've deliberately shared. None of them should automatically update the others, and following must never be treated as evidence that a student took the course.

| Information | Default | Who can see it / important detail |
| --- | --- | --- |
| Course, status, and term in a history entry | Private | Other admitted users only when that specific entry is set to **Visible on profile** |
| Private history note | Always private | The owner only; administrators can't read it through the app either |
| Review course association | Shown with the published review | Readers see it labeled **self-reported**, with a warning before publishing |
| Following a course | No member list in the first build | Does **not** imply Taking/Took |
| Posts and replies | Visible to admitted users | Logged-out visitors can't read anything, including images |
| Course stats | Calculated from published, nonremoved reviews | Never from history entries or notes |
| Primary institution | Visible, unless the user hides it | A hidden primary institution doesn't appear in other users' institution filters |
| Other institutions | Shown only with a visible history entry there | Private entries don't reveal past schools |

Don't expose the number of hidden history entries, hint at private courses anywhere, or make self-reported information look verified. Hidden history must stay hidden consistently in people search, profiles, counts, snippets, and every other route that could disclose it.

| Action | Regular user | Course moderator | Platform admin |
| --- | --- | --- | --- |
| Browse, read, follow courses | Yes | Yes | Yes |
| Ask, discuss, and reply | Yes; no need to follow the course | Yes | Yes |
| Write a review | Requires a Taking/Took entry | Same | Same |
| Edit/delete own posts | Yes, except editing moderator-removed content | Same | Same |
| Report posts and replies | Yes | Yes | Yes |
| Handle reports, remove content, lock discussions | No | Only assigned courses | Across the platform |
| Inspect removed content | No | Only assigned courses | Yes |
| Restore or permanently delete removed content | No | No | Yes |
| Assign moderators, manage invitations | No | No | Yes |
| Manage the course catalog and profanity list | No | No | Yes |
| Suspend users | No | No | Yes |
| Read another user's private history or notes | No | No | No |

Course spaces have no owner. Being a moderator in one course doesn't confer permissions anywhere else. Whoever runs the database can still see stored data; these rules are about what the app allows.

Check sessions, admission, suspension, and permissions on every page, API, image request, and socket subscription. Users must not be able to forge the owner, author, role, or visibility of a record through request data. Use **narrow database projections** that return only fields the current user may read, rather than returning everything and hoping the Svelte component hides the sensitive parts.

## Content and reviews

Initial post types are questions, discussions, and reviews. Defer Experience posts. Replies nest at most one level. The question author can select, replace, or clear one accepted reply. Removing that reply clears acceptance. Defer votes and reputation.

Publishing a review requires a Taking/Took entry; Planning doesn't qualify. Permit one editable review per person per course, even with repeated attempts. Record workload from 1 to 5, would-take-again yes/no, term, participation status, and written feedback. Before publishing, warn that the review discloses self-reported participation even when the history entry is private. Publishing never changes history visibility, and nothing should claim a school verified it.

Authors may edit written feedback, workload, and would-take-again. Course, participation status, and term stay fixed as the publication snapshot. Changing the reviewed course requires deleting and recreating the review. Preserve the snapshot if the history entry is deleted or changed to Planning. Aggregate published, nonremoved reviews for workload, would-take-again percentage, and count. Anonymized reviews from deleted accounts stay in statistics while published. Never aggregate private history or notes.

Use basic Markdown input with formatting help, without a toolbar or preview. Render published formatting safely and disable raw HTML and external images. Defer syntax highlighting, but preserve whitespace and contain horizontal scrolling within code blocks. Keep image attachment controls separate. Preserve account-isolated local drafts per post/reply target, clearing them after successful submission and on logout.

## Image uploads

Allow two images per top-level post, not replies. Accept JPEG, PNG, and WebP, at most 2 MB per image after processing, with a 100 MB application-wide stored-image quota. Validate on the server, resize without cropping, preserve aspect ratio, and strip metadata. Keep screenshots and diagrams readable rather than maximizing compression. Define input byte and pixel limits before decoding. Browser compression is only a convenience.

Store image binaries separately from posts in MongoDB. Serve them through authenticated, authorized endpoints. Request alt text and show upload failures clearly. Media attached to removed content must not remain accessible through direct URLs.

At the quota, existing content keeps working and new uploads fail clearly. Admins can inspect usage and use authorized deletion controls. Don't automatically delete published images.

## Search and realtime

Search courses, posts, and people with institution context. People filters cover name/username, institution, course, and history status, using visible academic information only. Start with exact course-code lookup and ordinary text search. Defer fuzzy matching and autocomplete.

Persist writes through authenticated HTTP requests before publishing small Socket.IO notices. Authenticate sockets, authorize subscriptions, and refetch persisted content on reconnect. New activity queues behind a notice instead of shifting reading content. Defer online presence, notification inboxes, notification emails, and cross-course unread badges.

## Moderation and deletion

Users report posts and replies with a reason and optional explanation. Course moderators handle course-scoped queues and can lock discussions, preventing new replies. Admins manage catalog, invitations, roles, and platform moderation. Suspension denies requests and disconnects sockets while preserving records.

Admins manage a short profanity list and exception list. Block submissions with clear validation feedback and preserve drafts. Match whole words case-insensitively in titles, prose, usernames, and display names. Exempt fenced/inline code, private notes, email addresses, and passwords. Code remains reportable. Changes apply to future submissions and edits, without rewriting existing content.

Show edited timestamps but defer post-version history. Log moderation actor, target, reason, and time. Moderator removal hides content from ordinary readers, search, statistics, and image delivery while retaining it for administrator review and restoration. Assigned-course moderators may inspect retained removed content. Only admins can restore or permanently delete it. Authors cannot edit removed content but can delete its body and attachments; preserve the action record without the deleted text.

Author deletion removes the post body and attachments, preserves a deleted placeholder and replies, and excludes the post from feeds, search, and statistics. Account deletion removes private history and profile data and anonymizes retained content as Deleted user. Remove images attached only to deleted content. Explain retention before confirmation. Retained prose may still contain identifying details.

## Performance and loading

Prioritize low memory use, fast transitions/loading, and perceived responsiveness with realistic content on modest devices. Cold starts remain an accepted free-hosting limitation.

Course and post lists use automatic infinite scrolling with a visible Load more fallback and bounded database pagination. Replies use explicit Load more. Preserve reading position when returning from threads and when loading additional replies.

Show clearly marked pending replies during submission, retaining failed text with Retry and preventing duplicate retries. Wait for confirmation before showing reviews, moderation actions, or permission changes as successful.

Show same-account cached content while refreshing, with quiet refresh/error feedback. Use static skeletons only when there's no content to show, avoid shimmer/pulse animation, and keep dimensions stable. Cached content never authorizes actions. Clear account caches on logout or account changes.

## Hosting and design

Host the app on Render Free and the database on Atlas Free, independently of my personal server. Keep Cloudflare for domain DNS. No payment method or overage billing. Use fictional demonstration people and content. Keep the hosted app usable for at least about one month, provisionally one month after grading, and document export/recovery and free-tier inactivity behavior.

Build responsive, accessible core workflows and complete loading, error, empty, and permission states. Keep the Blueprint visual direction, including its documented light/dark themes and typography. Historical Home, Experience, presence, toolbar/preview, Focus, split-pane, and command-palette designs are deferred or superseded.
