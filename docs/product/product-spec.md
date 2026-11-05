# Academic course platform

**Status:** Confirmed assignment scope, November 5, 2026. Implementation remains unverified. The [decision register](../planning/decision-register.md) records the choices and rationale.

## Access and accounts

Use Clerk through community-maintained `svelte-clerk`, initially with email/password and required email verification. MFA is deferred because production Clerk MFA requires a paid plan. Google login remains undecided.

Application access requires an individual, single-use invitation stored in MongoDB. Invitations match an independently verified Clerk email, expire after seven days, and can be revoked and replaced. An admin screen produces copyable links for manual delivery. Redeem atomically. A forwarded invitation alone cannot prove email ownership. Clerk invitation tickets do not meet that verification requirement.

An authenticated account without admission cannot access academic content. Enforce admission, suspension, and permissions for pages, APIs, images, and WebSocket subscriptions. Bootstrap the first administrator using Mathew's explicitly configured Clerk user ID. Invitations create regular users. Only existing admins grant elevated permissions.

Onboarding requires username, display name, and primary institution. History and course following are optional. Use initials with consistent generated colors for avatars; defer avatar uploads and require neither a photo nor a bio. Users have a unique username and an editable display name. Username changes are deferred. Email addresses stay private. Prepare separate fictional user, moderator, and admin demonstration accounts, and invite the professor to create his own account.

## Courses and navigation

Admins manage fictional institutions and courses. Each course belongs to an institution and automatically gets one canonical discussion space. Course codes alone are not globally unique.

Each course has Overview, Questions, Reviews, and Discussion. Overview combines activity from the other views and has no separate post type. Defer configurable channels and general communities.

After sign-in, resume the last accessible course or open Explore. New users start with discovery. Followed courses are navigation shortcuts, independent of academic history. Defer the standalone Home feed and cross-course unread counters.

Discovery defaults to the primary institution but allows other institutions. Admitted users can read, ask, discuss, and reply without following a course or claiming attendance.

## Histories and profiles

History entries are self-reported Planning, Taking, or Took records. Support repeated attempts with independent terms, statuses, and visibility. Terms use season and year; Planning may omit a term.

Entries start Private. Visible on profile exposes permitted course, status, and term fields to other admitted users. Private notes stay private. Grade entry and storage are deferred. Own profiles include all entries and a Preview as others option.

Let users hide their primary institution from profiles and other users’ institution filters while retaining it privately for discovery defaults. Show other institutions only when they have visible history entries. Private entries must not affect other people's filters, result counts, member details, or profile hints.

## Content and reviews

Initial post types are questions, discussions, and reviews. Defer Experience posts. Replies nest at most one level. The question author can select, replace, or clear one accepted reply. Removing that reply clears acceptance. Defer votes and reputation.

Publishing a review requires a Taking/Took entry. Permit one editable review per person per course. Record workload from 1 to 5, would-take-again yes/no, term, participation status, and written feedback. Warn before disclosing self-reported course participation even when the history entry is private. Publishing never changes history visibility.

Authors may edit written feedback, workload, and would-take-again. Course, participation status, and term stay fixed as the publication snapshot. Changing the reviewed course requires deleting and recreating the review. Preserve the review's publication-time participation snapshot if the history entry is deleted or changed to Planning. Aggregate published, nonremoved reviews for workload, would-take-again percentage, and count. Never aggregate private history or notes.

Use basic Markdown input with formatting help, without a toolbar or preview. Render published formatting safely and disable raw HTML and external images. Keep image attachment controls separate. Preserve account-isolated local drafts per post/reply target, clearing them after successful submission and on logout.

## Image uploads

Allow two images per top-level post, not replies. Accept JPEG, PNG, and WebP, at most 2 MB per image after processing, with a 100 MB application-wide stored-image quota. Validate on the server, resize without cropping, preserve aspect ratio, and strip metadata. Define input byte and pixel limits before decoding. Browser compression is only a convenience.

Store image binaries separately from posts in MongoDB. Serve them through authenticated, authorized endpoints. Request alt text and show upload failures clearly. Reject uploads when the quota is full. Media attached to removed content must not remain accessible through direct URLs.

## Search and realtime

Search courses, posts, and people with institution context. People filters cover name/username, institution, course, and history status, using visible academic information only. Start with exact course-code lookup and ordinary text search. Defer fuzzy matching and autocomplete. Use MongoDB text indexes for initial full-text search and ordinary indexes for course codes and structured filters. Defer Atlas Search.

Use Socket.IO with WebSocket transport. Persist writes through authenticated HTTP requests before publishing small notices. Authenticate sockets, authorize subscriptions, and refetch persisted content on reconnect. New activity queues behind a notice instead of shifting reading content. Defer online presence, notification inboxes, notification emails, and cross-course unread badges.

## Moderation and deletion

Users report posts and replies with a reason and optional explanation. Space moderators handle course-scoped queues and can lock discussions, preventing new replies. Admins manage catalog, invitations, roles, and platform moderation. Suspension denies requests and disconnects sockets while preserving records.

Admins manage a short profanity list and exception list. Block submissions with clear validation feedback and preserve drafts. Match whole words case-insensitively in titles, prose, usernames, and display names. Exempt fenced/inline code, private notes, email addresses, and passwords. Code remains reportable. Changes apply to future submissions and edits, without rewriting existing content. Filter implementation remains open.

Show edited timestamps but defer post-version history. Log moderation actor, target, reason, and time. Moderator removal hides content from ordinary readers, search, statistics, and image delivery while retaining it for administrator review and restoration. Assigned-course moderators may inspect retained removed content. Only admins can restore or permanently delete it. Authors cannot edit removed content but can delete its body and attachments; preserve the action record without the deleted text.

Author deletion removes the post body and attachments, preserves a deleted placeholder and replies, and excludes the post from feeds, search, and statistics. Account deletion removes private history and profile data and anonymizes retained content as Deleted user. Remove images attached only to deleted content. Explain retention before confirmation. Retained prose may still contain identifying details.

## Delivery and design

Host the app on Render Free and the database on Atlas Free, independently of the personal server. Keep Cloudflare for domain DNS. No payment method or overage billing. Cold starts are acceptable. Use fictional demonstration data.

Build responsive, accessible core workflows and complete loading, error, empty, and permission states. Keep the existing Blueprint visual direction, including its documented light/dark themes and typography, as explicitly selected over the standing true-black/minimal preference. Historical Home, Experience, presence, toolbar/preview, Focus, split-pane, and command-palette designs are deferred or superseded. For nontrivial UI changes, present distinct static mocks and wait for a selection before implementing real components.

## Reading and availability

Discussion lists default to newest activity, with Newest and Unanswered filters for questions. Replies remain chronological. Defer syntax highlighting but preserve whitespace and contain scrolling within code blocks.

Other profiles group visible entries by institution and term and show course and status. Empty profiles must not reveal whether private entries exist.

Plan for at least about one month of hosted availability, provisionally one month after grading. Confirm the calendar end date later and document export/recovery and free-tier inactivity behavior.

Thread activity advances only on creation and new replies. Anonymized reviews from deleted accounts remain in statistics while published.

## Confirmed implementation tools

Use pnpm, Zod, Sharp, the official MongoDB driver, Socket.IO, and TanStack Query for client-side server-data caching from the start. Clerk uses the community-maintained Svelte Clerk integration. Use TanStack Markdown initially, with markdown-it as the fallback if integration proves cumbersome. Production runtime and pinned versions require compatibility verification.

TanStack Virtual and TanStack Table are optional candidates for measured long-list rendering needs and richer admin tables, respectively. They are not required initial dependencies.

## Performance and operational behavior

Prioritize low memory use, fast transitions/loading, and perceived responsiveness with realistic content on modest devices. Keep image text readable rather than maximizing compression. Cold starts remain an accepted free-hosting limitation.

Application administrators cannot read another user's private history or notes through application endpoints. Database-operator access is a separate operational boundary.

After admission, verified email changes preserve access through the same Clerk user ID. Roles and suspension remain tied to that identity.

At the image quota, existing content continues working and new uploads fail clearly. Admins can inspect usage and use authorized deletion controls. Do not automatically delete published images.

## List loading and submission feedback

Course and post lists use automatic infinite scrolling with a visible Load more fallback and bounded database pagination. Replies use explicit Load more. Preserve reading position when returning from threads and when loading additional replies.

Virtualize browsing lists when growth warrants it, using TanStack Virtual. Bound retained Query pages separately because virtualization does not bound cache memory. Verify scroll restoration when old pages are evicted.

Show clearly marked pending replies during submission, retaining failed text with Retry and preventing duplicate retries. Wait for confirmation before showing reviews, moderation actions, or permission changes as successful.

Show same-account cached content while refreshing, with quiet refresh/error feedback. Use static skeletons only without available content, avoid shimmer/pulse animation, and keep dimensions stable. Clear account caches on logout or account changes.
