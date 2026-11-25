# Technical architecture

**This is still mostly a plan.** I want something relatively straightforward to build and maintain, with the database and security responsibilities separated clearly enough that I can work on one part without tangling everything together. The repository is the source of truth for what actually exists, and the [README](../../README.md#tools-weve-chosen) lists the chosen tools.

## Client/server structure

Confirmed November 7, 2026: one repository and one deployable application with clearly separated client/server responsibilities and an explicit HTTP API for core reads and writes. SvelteKit hosts both the web client and the server. A future mobile or desktop client could use the same API and realtime events without imitating web-page form submissions, but only the web client is in assignment scope. This doesn't need a separate backend framework, separate deployments, microservices, or multiple packages; the separation is in the code, not the infrastructure.

- Clients own presentation and interaction. They never access MongoDB directly or decide authorization.
- Application services own business rules and permission enforcement, including admission, review eligibility, privacy, and moderation. They take the authenticated user's identity rather than page events or form data.
- HTTP handlers validate input and turn service results into explicit responses and errors. Repositories own database queries and mappings.
- Web loads and form actions are thin wrappers around the same services, not a second implementation of the rules. Server-rendered pages call services directly instead of making HTTP requests to their own API.
- Shared request/response types are fine; MongoDB documents and server internals stay on the server. Responses return deliberately chosen, privacy-aware fields rather than raw database records.
- Socket authentication and subscriptions use the same permission checks. Changes are saved through HTTP first, then announced over the socket.

**Current implementation:** `src/lib/server/` separates services, repositories, access policy, and persistence. Invitations were the first feature built this way, followed by the course catalog and following, onboarding and profiles, academic history, then questions and discussions. Each has HTTP endpoints that use the same services as the web pages. HTTP and realtime share the same account-access checks, and `src/lib/contracts/` defines the request and response types the client sees. Dates are sent as ISO strings. Other APIs will be added along with their features.

### Invitation HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/invitations` | Active administrator | Bounded pending/recent-closed lists, with `hasMorePendingInvitations` |
| `POST /api/invitations` | Active administrator | JSON `{ email }`; returns token, email, and ISO expiry with status 201 |
| `POST /api/invitations/{invitationId}/revoke` | Active administrator | JSON `{}`; returns `{ revoked: true }`, or 409 when unavailable |
| `POST /api/invitations/redeem` | Signed-in identity; admission not required | JSON `{ token }`; returns `{ kind: 'admitted' }` or `{ kind: 'already-admitted' }` |

### Moderator assignment HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/moderators` | Active administrator | The newest 200 assignments, each with its course, school, the moderator's username and display name, and `assignedAt`, plus `hasMoreAssignments` |
| `POST /api/moderators` | Active administrator | JSON `{ courseId, username }`, with or without the `@`; returns the assignment with status 201. Assigning someone again returns the existing assignment. 404 `course-not-found`, or `user-not-found` for a username no onboarded account has |
| `DELETE /api/moderators/{assignmentId}` | Active administrator | No body; returns 204, or 404 `moderator-assignment-not-found` |

A moderator can lock and unlock threads in their assigned courses and nowhere else; administrators can everywhere. `CourseModerationAccess` decides both the lock endpoint and the thread's `canLock`, and the check runs on every request, so a page left open after an assignment is removed still shows the button but the server refuses. Moderators have the `member` role, since the role is platform-wide and an assignment is per course. Reports, removal, and the moderation log aren't built.

Authentication uses the existing Clerk request middleware; actor identity and roles are never taken from request bodies. Writes reject a supplied Origin that differs from the request origin, and writes with a body require `application/json`; bodyless `DELETE` is safe because HTML forms can't send it and cross-origin fetches need a preflight. No cross-origin browser API access is enabled.

### Profile HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/profile` | Admitted user | The caller's username, display name, primary institution, and `isPrimaryInstitutionHidden`, or 409 `onboarding-required` |
| `POST /api/profile` | Admitted user | JSON `{ primaryInstitutionId, username, displayName }`; completes onboarding with status 201. 409 when the username is taken or the profile already exists, 404 for an unknown institution |
| `PATCH /api/profile` | Admitted user with a profile | JSON `{ displayName?, isPrimaryInstitutionHidden? }` with at least one of them; returns the updated profile. The username can't be changed |
| `GET /api/profile/activity?type=…&after=…` | Admitted user | One page of 20 of the caller's own `posts` (questions and discussions), `replies`, or `reviews`, newest first, each with its course code. Replies come with their post's title and a plain-text excerpt; replies under removed posts are left out, so a page can be short. There is no way to ask for another user's activity |

An admitted account without a profile is sent to onboarding by every web page. On a fresh database there are no schools to choose, so onboarding offers administrators the demo catalog load that otherwise lives under **Admin → Course catalog**. Usernames are lowercase, unique, and can't be changed; a few names that look like staff or system accounts are reserved.

Onboarding has three steps: the school, then the display name and username, then an optional course step at `/onboarding/courses`. The second step creates the profile, so the third can be skipped or abandoned without leaving the account half set up. It lists the primary institution's courses, and each one can be added to history, followed, both, or neither. Adding records a private Taking entry for the current term through `POST /api/history`; following uses the following endpoints. Neither action triggers the other.

### Course catalog HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/institutions` | Admitted user | Institutions ordered by name |
| `GET /api/courses?institutionId=…&after=…` | Admitted user | One page of an institution's courses in code order, each with `isFollowed`; pass `nextCursor` as `after` for the next page |
| `GET /api/courses/{courseId}` | Admitted user | Course detail with its institution and `isFollowed` |
| `PUT /api/courses/{courseId}/following` | Admitted user | JSON `{}`; follows the course and returns `{ isFollowed: true }`. Repeating it changes nothing |
| `DELETE /api/courses/{courseId}/following` | Admitted user | No body; returns `{ isFollowed: false }` |
| `GET /api/following` | Admitted user | The caller's followed courses, most recent first |
| `PUT /api/courses/{courseId}/visit` | Admitted user | JSON `{}`; records the course as the caller's last visited one and returns `{ recorded: true }` |
| `GET /api/admin/catalog/courses` | Active administrator | The whole catalog with institution names, bounded, with `hasMoreCourses` |
| `POST /api/admin/catalog/demo-data` | Active administrator | JSON `{}`; loads the demo catalog and returns how many institutions and courses were added |

### Academic history HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/history` | Admitted user | All of the caller's entries, including private ones, visibility, and notes |
| `POST /api/history` | Admitted user | JSON `{ courseId, status, term, visibility?, privateNote? }`; returns the entry with status 201. Visibility defaults to private. 404 for an unknown course, 409 at the 200-entry limit |
| `PUT /api/history/{entryId}` | Owner | JSON `{ status, term, visibility, privateNote }`; replaces those fields. The course can't change |
| `DELETE /api/history/{entryId}` | Owner | No body; returns 204 |
| `GET /api/users/{username}/history` | Admitted user | Only that user's visible entries: course, status, and term. 404 for an unknown username |
| `GET /api/users/{username}` | Admitted user | That user's display name, username, Clerk photo URL or null, primary institution (null when hidden), and `isOwnProfile`. Never email or role. 404 for an unknown username |

`status` is `planning`, `taking`, or `took`; `term` is `{ season, year }` with `season` one of `winter`, `spring`, `summer`, `fall`, and only Planning may send `null`. Another user's entry answers 404 exactly like a missing one. Someone with only private entries looks the same as someone with none, and administrators get no exception.

Profile pages for other students live at `/users/{username}`. They show the person's visible entries grouped by term and school. Schools other than the primary institution appear only through visible entries. Opening your own page shows it as others see it, with a link back to editing. Only the owner's `/profile` page lists their own posts, replies, and reviews, with Load more; `/users/{username}` shows history only, for everyone. Photos are read from Clerk on the server for each view, and initials are shown if Clerk can't be reached. A user can hide their primary institution from the profile page's School section. The repository then returns no institution for the public profile, including when the owner opens their own page, and the school shows up only if a visible entry is there. Course discovery still defaults to it for the owner.

### Posts and replies HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/courses/{courseId}/posts?kind=…&filter=…&after=…` | Admitted user | One page of 20 posts without bodies, each with author, reply count, `hasAcceptedReply`, and `isLocked`. `kind` is `question`, `discussion`, or `review`; leaving it out lists all three, as Overview does. Reviews include their published participation and ratings. `filter` is `active` (default), `newest`, or `unanswered`; reviews can also use `lowest-workload` or `highest-workload`, and take `workload` (1 to 5) and `wouldTakeAgain` (`yes` or `no`). A workload order's cursor starts with the workload |
| `POST /api/courses/{courseId}/posts` | Admitted user with a profile | JSON `{ kind, title, bodyMarkdown }`; creates only questions and discussions with status 201. Reviews use their own endpoint so eligibility can't be bypassed |
| `GET /api/posts/{postId}` | Admitted user | The post with its body, `acceptedReplyId`, and `viewerPermissions` |
| `GET /api/posts/{postId}/replies?after=…` | Admitted user | One page of 30 replies, oldest first |
| `POST /api/posts/{postId}/replies` | Admitted user with a profile | JSON `{ bodyMarkdown, parentReplyId?, submissionId }`; returns the reply with status 201. 409 `post-locked` or `parent-reply-unavailable` |
| `PUT /api/posts/{postId}/accepted-reply` | The question's author | JSON `{ replyId }`; chooses or replaces the accepted reply and returns the post. 409 on a discussion |
| `DELETE /api/posts/{postId}/accepted-reply` | The question's author | No body; clears it and returns the post |
| `PUT /api/posts/{postId}/lock` | The course's moderators and active administrators | JSON `{}`; locks the thread and returns the post. 403 `forbidden` for anyone else |
| `DELETE /api/posts/{postId}/lock` | The course's moderators and active administrators | No body; unlocks it |
| `GET /api/posts/{postId}/reactions` | Admitted user | Reaction counts for the post and every reply in its thread, each with `reactedByViewer`. 409 `reactions-not-allowed` on a review |
| `PUT /api/posts/{postId}/reactions/{emoji}` | Admitted user with a profile | JSON `{}`; reacts to the post and returns 204. Repeating it changes nothing. `emoji` is `thumbs-up`, `heart`, `laugh`, `celebrate`, `thinking`, or `thanks` |
| `DELETE /api/posts/{postId}/reactions/{emoji}` | Admitted user with a profile | No body; removes the caller's reaction and returns 204, also when there was none |
| `PUT` and `DELETE /api/posts/{postId}/replies/{replyId}/reactions/{emoji}` | Admitted user with a profile | The same for a reply. 404 `reply-not-found` for a reply of another post |
| `GET /api/mentions?after=…` | Admitted user with a profile | One page of 20 posts and replies that mention the caller, newest first, each with course code, post kind and title, author, and a plain-text excerpt. Removed and deleted posts, and replies on them, are left out |
| `GET /api/mentions/suggestions?prefix=…` | Admitted user with a profile | Up to six active, onboarded people whose username or a word of their display name starts with `prefix`, username matches first, never the caller. Feeds the `@` list in Markdown fields |
| `GET /api/courses/{courseId}/reviews` | Admitted user | Published-review statistics, the caller's `ownReviewId` or null, and their qualifying history attempts with only id, status, and term |
| `POST /api/courses/{courseId}/reviews` | Admitted user with a profile and qualifying history | JSON `{ historyEntryId, acknowledgedStatus, acknowledgedTerm, disclosureAcknowledged: true, title, bodyMarkdown, workload, wouldTakeAgain }`; returns the review post with status 201. 409 `history-required` when the entry no longer qualifies or its status or term no longer match what was acknowledged, or `review-exists` |
| `PUT /api/posts/{postId}/review` | Review author | JSON `{ title, bodyMarkdown, workload, wouldTakeAgain }`; returns the updated post. A missing, removed, or another author's review answers 404 |

Reading, asking, discussing, and replying need neither following nor a history entry. Publishing a review requires the caller's Taking/Took entry for that exact course. `active` orders by `lastActivityAt`, which advances on creation and new replies only; `newest` orders by creation; `unanswered` lists questions without replies, newest first, and is refused for discussions and reviews. Titles hold up to 150 characters, post bodies 10,000, and replies 5,000. Titles and bodies are trimmed at both ends, bodies are otherwise stored as written and rendered as Markdown by `MarkdownRenderer`.

A reply names its parent with `parentReplyId`, which must be a top-level reply of the same post, so nesting stops at one level. `submissionId` is a UUID the client picks once per reply and sends again on Retry. It's unique per author, so a repeated request returns the reply stored the first time. The reply and the post's `replyCount` and `lastActivityAt` are written in one transaction, and the post update matches only an unlocked post, so a reply can't land while the thread is being locked. Any reply of the question can be accepted, including a nested one or the author's own. Locking and accepting don't count as activity. The course's moderators and administrators can lock. An account without a profile gets 409 `onboarding-required` when it tries to post.

Reactions acknowledge a post or reply without replying. They never sort, rank, or filter anything, don't count as activity, and don't feed review statistics. Review threads take none, on the review or its replies, so a reaction can't read as agreement with a rating. Locked threads still take them, since locking stops replies only.

Mentions are `@username` in the text of a question, discussion, or reply, outside code and links. `MarkdownRenderer.toMentionedUsernames` finds them, and `MentionService` keeps the active, onboarded accounts among them, leaving out the author, up to ten per post or reply. The kept ones are stored on the post or reply and returned as `mentionedUsernames`; `MarkdownBody` links only those to `/users/{username}`, so any other `@name`, and a reply that hasn't been sent yet, stays plain text. Every admitted account can read every course, so anyone active can be mentioned. A mention that isn't kept never refuses the post or reply. The composers offer people as you type `@` and a letter, from `GET /api/mentions/suggestions`, which ranks username matches first and never offers the author; arrow keys move through them, Enter or a tap inserts one, Escape closes the list, and Tab leaves the field. `/mentions` lists the caller's mentions. Mentions have no badges, emails, or read state.

Review publishing reads only the selected history entry's status and term, checking both owner and course. A partial unique index on `(courseId, authorId)` for reviews enforces one review even under concurrent requests. The embedded snapshot isn't linked back to history. Editing changes only title, body, ratings, and `editedAt`, without rechecking history or advancing activity. No review operation writes history or following. Statistics aggregate published reviews only.

Thread pages live at `/courses/{courseId}/questions/{postId}`, `/courses/{courseId}/discussion/{postId}`, and `/courses/{courseId}/reviews/{postId}`; a post opened under the wrong course or channel answers 404. `?reply={replyId}#reply-{replyId}` links to a reply: the page load reads that reply, and its top-level reply when it is nested, by id within the post, so the reply shows with a highlight ring even when it isn't on the first page, and the fragment scrolls to it. A nested reply whose top-level reply is loaded appears under it; otherwise the branch appears after the loaded replies until its page is loaded, then moves to its place. An id that is malformed or belongs to another thread is ignored. Reviews support editing; editing other post kinds, deleting, and reporting aren't built yet. New posts and replies from other people are announced as described under [Realtime](#realtime).

Following never reads or writes academic history. After a course page renders, the browser records it as the user's last visited course; it isn't recorded during the server load, so hover preloading doesn't count as a visit. `/` resumes that course after sign-in when it still exists.

Errors use `{ error: { code, message } }`, where `code` is one of the [error codes](#languages) and `message` is English for logs: 400 for invalid input/JSON, 401 for missing identity, 403 for denied access or redemption email mismatch, 404 for an unknown course, institution, post, or reply, 409 for revocation conflicts and refused replies, 410 for unavailable redemption, 415 for non-JSON writes, and a generic 500 for unexpected failures. Responses use `Cache-Control: no-store`, including the one-time creation token. Creation returns the token rather than a host-specific URL; the web page builds the invitation link.

## Deployment context

```text
Browser (phone, tablet, desktop)
  | SvelteKit navigation and HTTP requests
  v
SvelteKit server
  |-- session/auth checks
  |-- validation and permission-aware application services
  |-- MongoDB queries, writes, and review aggregations
  |-- image processing (Sharp) and authorized delivery
  `-- Socket.IO authentication, subscriptions, and events
            |
            v
         MongoDB Atlas
         (courses, histories, memberships, posts, replies, reports, images)
```

I don't want Svelte components deciding whether a user can access somebody else's history, and I don't want WebSocket state becoming a second, competing database. The server validates changes and stores them, then sends clients the information they're allowed to see. If a client reconnects or misses an event, it can get the real state back from MongoDB. The [diagrams](diagrams.md) show the request checks, admission, and realtime write path in more detail, and the [MongoDB model](mongodb-model.md) covers collections, indexes, and queries.

## Server modules

The exact folder names can change, but the responsibilities shouldn't all end up mashed into one file. Authentication handles sessions, admission, and invitations; the catalog handles institutions and courses; histories handle ownership, eligibility, and privacy; spaces handle following and course views. Posts and replies belong to content services, while discovery handles searches, statistics owns aggregation pipelines, moderation handles reports and scoped privileges, realtime handles sockets and subscriptions, and media handles validated uploads and quota.

I care more about those **clean seams** than the directory names. I should be able to add a feature without rewriting unrelated layers, and the permission rules should be in shared server code rather than copied across page components.

## Authentication

Clerk handles credentials and account identity through the community-maintained [Svelte Clerk SDK](https://github.com/clerk-community/svelte-clerk). MongoDB stores application profiles and domain data, linked by a unique Clerk user ID. Roles, moderator assignments, and history privacy are application rules enforced on the server.

Verify sign-up, sign-in, protected server routes, logout, and Socket.IO authentication before building dependent features. Decide how application profiles are created and how account changes and deletion are synchronized during integration.

## Realtime

After a post or reply is stored, the server sends a small event such as `post.created` or `reply.created` to listeners who are allowed to see it. MongoDB change streams might help, but **don't assume they're available**: the deployment has to support the necessary topology. Publishing directly from the service also works, but retries and multiple app instances would need some thought.

The browser shouldn't be able to pick someone else's identity or permissions through an event payload. Incoming items show up through a notice instead of rearranging the feed while someone is reading, and reconnecting refetches missed changes.

**Current implementation:** signed-in pages open one Socket.IO connection that sends a fresh Clerk session token on every connection attempt, since tokens expire within about a minute. The server rejects missing, invalid, or unadmitted sessions. A browser retries after a short delay when the server is still starting or the token request failed; an invalid or unadmitted session isn't retried.

A course page asks to hear that course with `course.subscribe { courseId }` and gets an acknowledgement. `CourseSubscriptionService` reads the account again, so a suspension after the handshake stops new subscriptions, and checks that the course exists; every admitted account can read every course, so there are no thread rooms. A socket is in at most one course room, and a slower check for a course the tab has already left is answered `superseded` and joins nothing. Each socket also joins a room for its account.

After a post, review, or reply is stored, its service calls `ContentEventPublisher`, which sends `post.created { courseId, postId, kind }` or `reply.created { courseId, postId, replyId }` to the course room, leaving out the author's own sockets, whose pages already show it. Events carry IDs only. Only a new insert is announced, not a retried reply submission, and a failed send is logged without failing the request. A new post or reply that mentions someone sends `mention.created { courseId, postId, postKind, replyId }` to that person's account room only, wherever they are in the app; `MentionNotice` in the app layout shows "Someone mentioned you" with a link until it's opened or closed. A reaction that actually changed sends `reaction.changed { courseId, postId }` to the whole course room, the reacting account's other tabs included; an open thread refetches its counts in place, without a notice, since counts don't move anything. Render runs one instance, so the in-memory adapter reaches every listener; more instances would need a shared adapter such as `@socket.io/mongo-adapter`. Change streams aren't used.

`CourseActivityNotices` holds the announced IDs for the open course. Post lists show "Show N new posts" (on Reviews, only while the list is unfiltered and ordered by date, where a new review would be on the first page) and threads "Show N new replies" in a floating button that takes no space, leaving out items already on the page; clicking refetches, and focus moves to the first new item. A thread with unloaded older pages doesn't show the notice, since new replies come with Load more replies. When replies arrive while the reader is within 80px of the page's end, with the tab visible, no dialog open, and focus in neither a text field nor the notice, the thread loads them without the notice and scrolls to the end, instantly under reduced motion. Any replies already waiting come with them, but scrolling to the end never loads them by itself, and replies waiting when the thread opens keep the notice. Focus stays put, and a polite live region announces them. If the reader scrolls up or starts typing during that load, the page stays where it is. The browser subscribes again on every reconnect, retries a request the server couldn't check, and refetches the queries on screen after every confirmed subscription, including the first, since events sent before the room was joined never arrive. Lock, edit, and removal events, disconnecting suspended accounts, presence, and unread badges aren't built.

## Client data and caching

TanStack Query owns the client cache for interactive server data such as course lists, threads, and replies, fetched through the HTTP API. SvelteKit handles routing and initial loading; initial data for Query-managed views goes into the same cache rather than a second mutable copy.

After writes, update or invalidate the affected queries. Socket events queue new-item notices without shifting content. Keep caches isolated by account, clear them on logout/account changes, and create a new server-side QueryClient per request. Cached data never replaces authorization.

**Current implementation:** the root layout creates the `QueryClient`, so each server render gets its own and each browser tab keeps one. Queries don't run during server rendering; a page's server load supplies `initialData` with its load time as `initialDataUpdatedAt`, and the query owns the data from then on. `AccountScopedQueryCache` clears the cache when the Clerk user changes, including sign-out. Browser API calls go through `src/lib/client/`, which also defines query keys. Academic history is the first view built this way: writes invalidate every `academic-history` key, which covers the owner's list and Preview as others. The course picker uses an infinite query over the course browse API. Post lists and reply lists are infinite queries too, seeded with the server-rendered first page. Post lists load the next page when the end scrolls into view and keep a Load more button; replies use Load more only. Opening a thread from a post list remembers, in memory for that tab, the list's order and filters, how many pages were loaded, and the first post row still on screen with its offset. Coming back from that thread to the list within 30 minutes, by Back, the header's back link, or any other link, reloads up to that many pages until the row and the opened post are there, puts the row at the same offset, and focuses the post, unless the reader scrolled or moved focus during those loads. Arriving any other way, or later, starts at the top, even by Back. A list with nothing to show yet stays empty for its first second and then shows a static skeleton of four rows; on the deployed site, course pages and threads measured well under a second, so navigations don't get one. A next page that fails to load shows an error and leaves the loaded items in place. A reply being sent appears as pending, and a failed one keeps its text with Retry and Discard.

**Local drafts:** the reply bar, the inline reply composers, and the new post dialog save their text to `localStorage` on every change, under the account's Clerk id and a target: the thread, one reply branch, or a new post in one course channel. Each target has one draft per tab, so the phone bar and the desktop composer show the same text, and typing survives in memory when storage fails. Another tab's change to a draft, including publishing it, updates it here through the `storage` event. Changing the bar's target swaps its text, and closing the post dialog keeps it. Sent text clears once it is published or queued, unless it was edited meanwhile here or in another tab, whose newer text then shows instead. The reply queue keeps each reply with its submission id in `localStorage` until the server confirms it. Once Clerk confirms the account, reopening the thread sends any left over again with the same id, so the server never stores one twice; a reply the server refused comes back as failed and waits for Retry or Discard, and choosing Retry lifts the refusal. A reply under a branch that isn't shown appears at thread level, pending or stored, until the branch loads. `AccountScopedLocalData` takes the account from the server's auth state, so drafts open as soon as the page is interactive. Once Clerk loads it removes every other account's local data, from storage and memory, or all of it when signed out, which also covers a sign-out or switch while the tab was closed. A thread gets a new reply queue when the account changes, and the old one stops writing, so no account sees or retries another's replies.

The Reviews view uses the same post list with an expandable composer above it. A separate `reviews` query owns statistics, the caller's existing review, and their qualifying attempts. Publishing or editing refreshes course post lists and review context; history form writes also invalidate review context. Reviews aren't shown as saved before the server confirms, and a failed submission keeps its text in the open composer.

Use TanStack Virtual for browsing lists once they grow enough to need it. Virtualization limits rendered elements, not fetched data, so bound Query's retained pages separately and test scroll restoration after old pages are evicted. Pending replies need a stable submission ID so Retry can't duplicate a reply that was stored before a lost response.

TanStack Table and Superforms are possible later additions, only if admin tables or form handling actually need them.

## Keyboard shortcuts

TanStack Hotkeys (`@tanstack/svelte-hotkeys`, pinned while it's in beta) handles every shortcut. `src/lib/client/hotkeys/KeyboardShortcuts.ts` declares them all with `defineAppHotkeys`: the default keys, a translated label, and the section of the shortcuts dialog. The app layout passes them to `HotkeysProvider`, and the dialog lists them from `getAppHotkeyList()`, so a new shortcut shows up there without any other change.

- **Adding a shortcut:** declare it in `KeyboardShortcuts.ts` with a label message in `messages/en.json` and `es.json`, then register it with `createHotkey` (or `createHotkeyAttachment` for one element) in the component that owns the action, passing `KEYBOARD_SHORTCUTS['the.id']` rather than its keys. `KeyboardShortcuts.spec.ts` fails if a shortcut has no modifier, label, or section, or reuses another's keys.
- **Modifiers only:** single-character shortcuts would need a setting to turn them off (WCAG 2.1.4), and the design handoff rules them out for version one. Shortcuts with Alt or Shift are skipped while typing in a field; Ctrl or ⌘ ones still fire there, except search.
- **Scopes:** the app layout puts everything under it, except the shortcuts dialog, in the `page` scope. Every dialog, alert dialog, and drawer wraps its open content in `ModalShortcutScope`, an exclusive scope that turns the `page` scope off but keeps `global`, so a page shortcut can't throw away a draft in a dialog. Ctrl+Enter is declared `global` because it only listens on its form, so it still sends from a dialog. The shortcuts list never opens over another dialog and closes with the same keys.
- **Formatting:** Markdown fields take Discord's keys: Ctrl+B for bold, Ctrl+I for italic, and Ctrl+Shift+M for inline code. Each wraps the selection in its markers, or removes them when they're already there. `MarkdownInlineFormatter` works out the edit, and the field applies it with `execCommand('insertText')` so one Ctrl+Z undoes it. A key does nothing when the result would pass the field's length limit, or when Markdown would show the markers as text, as across a blank line. Underline and spoilers are left out because the renderer doesn't support them.
- **Finding them:** Ctrl+/ (⌘/ on a Mac) opens the list from anywhere outside a dialog, and Settings has a Keyboard shortcuts row for people who don't know the keys yet. Key labels follow the browser's platform; the dialog renders only in the browser, so server rendering never shows them.

## Reply actions

Reactions show as chips with a count under the post and in each reply's action row, followed by a button that opens the six emoji. A chip or emoji toggles the caller's reaction at once. Toggles in a thread go to the server one at a time, in the order tapped, and the page shows the ones still waiting over the server's counts, so a refetch keeps them and a failed one drops out with an alert under its post or reply.

Every reply has a ⋯ button. On phones it opens a bottom sheet, and so does a long press on the reply. On desktop the same button opens a dropdown. Both list the actions `ThreadView` builds as `ReplyAction` objects (`src/lib/client/content/ReplyAction.ts`): Reply, Copy text, Copy link, and, for the question's author, Accept as answer or Clear accepted answer. `ReplyCard` also shows Reply and Accept as buttons, from the same list.

- **Adding an action:** push another `ReplyAction` in `replyActionsFor`, with a label message in `en.json` and `es.json`. `run` happens while the menu is still open, so the clipboard and other features that need a tap still work. `moveFocus` sends focus somewhere else as the menu closes, such as the reply field. The sheet closes during the tap, before Back removes its history entry, so iOS opens the keyboard. An action that opens its own dialog, such as Report, will need to wait for the sheet's exit animation so the two don't overlap.
- **Copy link:** copies the thread's address with `?reply={replyId}#reply-{replyId}`. The query lets the server load the reply wherever it is in the thread; the fragment scrolls to it.
- **One sheet:** `ThreadView` renders a single `ReplyActionSheet` for the whole page. Opening it adds a shallow history entry (`page.state.replyActionsReplyId`), so the phone's Back gesture closes it instead of leaving the thread; the Close button, Escape, and a swipe go back through history too, once even when a swipe reports the close twice. Focus moves into the sheet when it opens and returns to the ⋯ button or the reply when it closes.
- **Thread navigation:** a question with an accepted answer shows Jump to accepted answer beside the reply count, loading further pages until that reply is among them. Each nested reply links back to its branch's top-level reply ("In reply to …"), and the phone bar's "Replying to" chip goes to the reply being answered. In a thread over two screens long, Jump to latest floats above the reply bar, or the dock, while the newest reply is below the view, or, while more pages follow, until the end of the loaded replies is in view. It loads any remaining pages first and comes right after the reply count in the tab order. One jump loads pages at a time, joining a page request already in flight; if a page fails, focus goes to Load more replies and its error. All four go through `ScrollTargetReveal` (`src/lib/client/navigation/ScrollTargetReveal.ts`), which scrolls with `scrollIntoView`, so the page's scroll padding keeps the reply clear of the bar, and outlines the reply for two seconds. While Jump to latest shows, the scroll padding clears it too (`--latest-reply-jump-clearance`). With reduced motion the scroll is instant and the outline doesn't fade. Focus moves to the reply, except when the chip is tapped while the reply field has focus, so a phone keyboard stays open, or when the reader moved focus elsewhere while a jump was loading.
- **Long press:** `longPress` in `src/lib/client/gestures/LongPressGesture.ts` waits 500ms for one still finger, cancels on a second finger, ignores mouse and pen, and leaves links and buttons alone. It also swallows the click the lifted finger can send. Replies turn off text selection and iOS's callout on touch screens, except on links, since the long press replaces them and Copy text covers copying.

## Languages

Paraglide JS compiles `messages/{locale}.json` into typed functions in `src/lib/paraglide/`, which is generated and ignored by Git. `pnpm check` compiles first, so an unknown message key or a missing parameter fails type checking. `pnpm i18n:check` reports messages missing from a locale. A missing translation falls back to English at runtime.

- **Choosing the language:** the `resolveLocale` handle in `hooks.server.ts` reads the `PARAGLIDE_LOCALE` cookie, then `Accept-Language`, then English, and sets `<html lang>` and `dir`. Responses vary on `Cookie` and `Accept-Language`. The language picker on the sign-in page and in Settings writes the cookie and reloads the page.
- **Errors:** the server never sends display text. API errors, form-action errors, and page errors carry a code from `src/lib/contracts/ErrorContract.ts`, and contract schemas use validation codes as their messages. `src/lib/client/ErrorPresentation.ts` maps every code to a message; it's a complete record, so a new code doesn't compile until it has a translation. A too-long text reads its limit from the failed check.
- **Formatting:** dates, numbers, percentages, and relative times use `Intl` with the current locale. Plurals and academic terms such as "Fall 2026" are messages, so each language orders and inflects them itself.
- **Clerk:** the root layout passes Clerk's matching localization from `@clerk/localizations` (`src/lib/client/ClerkLocalization.ts`), and the sign-in, sign-up, and sign-out buttons get translated labels. Clerk's hosted Account Portal, which the sign-in and sign-up buttons redirect to, stays in English.
- **Machine translation:** `pnpm i18n:translate [locale]` fills missing messages with Gemini through the Antigravity CLI (`agy`), sending [`messages/translation-guide.md`](../../messages/translation-guide.md) with each batch from an empty temporary directory. Plural messages are sent as `{ one, other, … }` and rebuilt from the English declarations. A translation that changes placeholders, leading or trailing spaces, or plural structure is printed and left missing. It needs a signed-in `agy`, so it runs on a developer machine; CI only runs `pnpm i18n:check`. Machine output is a draft for a fluent speaker to review.
- **Adding a language:** add the locale to `project.inlang/settings.json`, add a section to the translation guide, run `pnpm i18n:translate`, and add its Clerk localization. `pnpm i18n:check` lists anything left untranslated, and the picker names the language in itself without new messages. A right-to-left language also needs the layout checked, since only `dir` is set today.

## Hosting and security

Sessions, socket handshakes, user-generated Markdown, and uploads all need validation and abuse protection. Post and reply bodies are rendered by `MarkdownRenderer` (markdown-it) in `src/lib/markdown/`, the same way on the server and in the browser: raw HTML shows as text, links allow only `http`, `https`, `mailto`, and same-site paths, images show only their description because attachments are displayed separately, and input is bounded by the body length limits. Below a body, `LinkPreviewResolver` turns up to four of its HTTPS links into previews from the address alone, with no server request: direct image and video files, Giphy GIFs, Imgur `.gifv` clips, YouTube thumbnails that load the `youtube-nocookie.com` player only when clicked, and Spotify players. Readers can hide any image preview, since an animated one can't be paused. The CSP therefore allows images and media from any HTTPS origin, which lets the linked host see a reader's IP address, and frames from those two players. The API sends Markdown, never HTML. The profanity filter will read code spans from the same parser. Image binaries live in their own MongoDB collection, and the 100 MB quota keeps them well inside Atlas Free's storage limit.

Free-tier limits and provider features can change, so **check them when deploying** instead of treating an old estimate as a guarantee. Secrets stay out of the repo, sample data is fictional, and setup, backup/recovery, and deployment need to be documented.
