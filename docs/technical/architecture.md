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

Authentication uses the existing Clerk request middleware; actor identity and roles are never taken from request bodies. Writes reject a supplied Origin that differs from the request origin, and writes with a body require `application/json`; bodyless `DELETE` is safe because HTML forms can't send it and cross-origin fetches need a preflight. No cross-origin browser API access is enabled.

### Profile HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/profile` | Admitted user | The caller's username, display name, primary institution, and `isPrimaryInstitutionHidden`, or 409 `onboarding-required` |
| `POST /api/profile` | Admitted user | JSON `{ primaryInstitutionId, username, displayName }`; completes onboarding with status 201. 409 when the username is taken or the profile already exists, 404 for an unknown institution |
| `PATCH /api/profile` | Admitted user with a profile | JSON `{ displayName?, isPrimaryInstitutionHidden? }` with at least one of them; returns the updated profile. The username can't be changed |

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

Profile pages for other students live at `/users/{username}`. They show the person's visible entries grouped by term and school. Schools other than the primary institution appear only through visible entries. Opening your own page shows it as others see it, with a link back to editing. Photos are read from Clerk on the server for each view, and initials are shown if Clerk can't be reached. A user can hide their primary institution from the profile page's School section. The repository then returns no institution for the public profile, including when the owner opens their own page, and the school shows up only if a visible entry is there. Course discovery still defaults to it for the owner.

### Posts and replies HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/courses/{courseId}/posts?kind=…&filter=…&after=…` | Admitted user | One page of 20 posts without bodies, each with author, reply count, `hasAcceptedReply`, and `isLocked`. `kind` is `question`, `discussion`, or `review`; leaving it out lists all three, as Overview does. Reviews include their published participation and ratings. `filter` is `active` (default), `newest`, or `unanswered` |
| `POST /api/courses/{courseId}/posts` | Admitted user with a profile | JSON `{ kind, title, bodyMarkdown }`; creates only questions and discussions with status 201. Reviews use their own endpoint so eligibility can't be bypassed |
| `GET /api/posts/{postId}` | Admitted user | The post with its body, `acceptedReplyId`, and `viewerPermissions` |
| `GET /api/posts/{postId}/replies?after=…` | Admitted user | One page of 30 replies, oldest first |
| `POST /api/posts/{postId}/replies` | Admitted user with a profile | JSON `{ bodyMarkdown, parentReplyId?, submissionId }`; returns the reply with status 201. 409 `post-locked` or `parent-reply-unavailable` |
| `PUT /api/posts/{postId}/accepted-reply` | The question's author | JSON `{ replyId }`; chooses or replaces the accepted reply and returns the post. 409 on a discussion |
| `DELETE /api/posts/{postId}/accepted-reply` | The question's author | No body; clears it and returns the post |
| `PUT /api/posts/{postId}/lock` | Active administrator | JSON `{}`; locks the thread and returns the post |
| `DELETE /api/posts/{postId}/lock` | Active administrator | No body; unlocks it |
| `GET /api/courses/{courseId}/reviews` | Admitted user | Published-review statistics, the caller's `ownReviewId` or null, and their qualifying history attempts with only id, status, and term |
| `POST /api/courses/{courseId}/reviews` | Admitted user with a profile and qualifying history | JSON `{ historyEntryId, acknowledgedStatus, acknowledgedTerm, disclosureAcknowledged: true, title, bodyMarkdown, workload, wouldTakeAgain }`; returns the review post with status 201. 409 `history-required` when the entry no longer qualifies or its status or term no longer match what was acknowledged, or `review-exists` |
| `PUT /api/posts/{postId}/review` | Review author | JSON `{ title, bodyMarkdown, workload, wouldTakeAgain }`; returns the updated post. A missing, removed, or another author's review answers 404 |

Reading, asking, discussing, and replying need neither following nor a history entry. Publishing a review requires the caller's Taking/Took entry for that exact course. `active` orders by `lastActivityAt`, which advances on creation and new replies only; `newest` orders by creation; `unanswered` lists questions without replies, newest first, and is refused for discussions and reviews. Titles hold up to 150 characters, post bodies 10,000, and replies 5,000. Titles and bodies are trimmed at both ends, bodies are otherwise stored as written and rendered as Markdown by `MarkdownRenderer`.

A reply names its parent with `parentReplyId`, which must be a top-level reply of the same post, so nesting stops at one level. `submissionId` is a UUID the client picks once per reply and sends again on Retry. It's unique per author, so a repeated request returns the reply stored the first time. The reply and the post's `replyCount` and `lastActivityAt` are written in one transaction, and the post update matches only an unlocked post, so a reply can't land while the thread is being locked. Any reply of the question can be accepted, including a nested one or the author's own. Locking and accepting don't count as activity. Course moderators will be able to lock once assignments exist; until then only administrators can. An account without a profile gets 409 `onboarding-required` when it tries to post.

Review publishing reads only the selected history entry's status and term, checking both owner and course. A partial unique index on `(courseId, authorId)` for reviews enforces one review even under concurrent requests. The embedded snapshot isn't linked back to history. Editing changes only title, body, ratings, and `editedAt`, without rechecking history or advancing activity. No review operation writes history or following. Statistics aggregate published reviews only.

Thread pages live at `/courses/{courseId}/questions/{postId}`, `/courses/{courseId}/discussion/{postId}`, and `/courses/{courseId}/reviews/{postId}`; a post opened under the wrong course or channel answers 404. Reviews support editing; editing other post kinds, deleting, reporting, drafts, and realtime notices aren't built yet.

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

**Current implementation:** signed-in pages open one Socket.IO connection that sends a fresh Clerk session token on every connection attempt, since tokens expire within about a minute. The server rejects missing, invalid, or unadmitted sessions. A browser retries after a short delay when the server is still starting or the token request failed; an invalid or unadmitted session isn't retried. Subscriptions and events come with the first realtime feature.

## Client data and caching

TanStack Query owns the client cache for interactive server data such as course lists, threads, and replies, fetched through the HTTP API. SvelteKit handles routing and initial loading; initial data for Query-managed views goes into the same cache rather than a second mutable copy.

After writes, update or invalidate the affected queries. Socket events queue new-item notices without shifting content. Keep caches isolated by account, clear them on logout/account changes, and create a new server-side QueryClient per request. Cached data never replaces authorization.

**Current implementation:** the root layout creates the `QueryClient`, so each server render gets its own and each browser tab keeps one. Queries don't run during server rendering; a page's server load supplies `initialData` with its load time as `initialDataUpdatedAt`, and the query owns the data from then on. `AccountScopedQueryCache` clears the cache when the Clerk user changes, including sign-out. Browser API calls go through `src/lib/client/`, which also defines query keys. Academic history is the first view built this way: writes invalidate every `academic-history` key, which covers the owner's list and Preview as others. The course picker uses an infinite query over the course browse API. Post lists and reply lists are infinite queries too, seeded with the server-rendered first page. Post lists load the next page when the end scrolls into view and keep a Load more button; replies use Load more only. A next page that fails to load shows an error and leaves the loaded items in place. A reply being sent appears as pending, and a failed one keeps its text with Retry and Discard.

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

## Languages

Paraglide JS compiles `messages/{locale}.json` into typed functions in `src/lib/paraglide/`, which is generated and ignored by Git. `pnpm check` compiles first, so an unknown message key or a missing parameter fails type checking. `pnpm i18n:check` reports messages missing from a locale. A missing translation falls back to English at runtime.

- **Choosing the language:** the `resolveLocale` handle in `hooks.server.ts` reads the `PARAGLIDE_LOCALE` cookie, then `Accept-Language`, then English, and sets `<html lang>` and `dir`. Responses vary on `Cookie` and `Accept-Language`. The language picker on the sign-in page and in Settings writes the cookie and reloads the page.
- **Errors:** the server never sends display text. API errors, form-action errors, and page errors carry a code from `src/lib/contracts/ErrorContract.ts`, and contract schemas use validation codes as their messages. `src/lib/client/ErrorPresentation.ts` maps every code to a message; it's a complete record, so a new code doesn't compile until it has a translation. A too-long text reads its limit from the failed check.
- **Formatting:** dates, numbers, percentages, and relative times use `Intl` with the current locale. Plurals and academic terms such as "Fall 2026" are messages, so each language orders and inflects them itself.
- **Clerk:** the root layout passes Clerk's matching localization from `@clerk/localizations` (`src/lib/client/ClerkLocalization.ts`), and the sign-in, sign-up, and sign-out buttons get translated labels. Clerk's hosted Account Portal, which the sign-in and sign-up buttons redirect to, stays in English.
- **Machine translation:** `pnpm i18n:translate [locale]` fills missing messages with Gemini through the Antigravity CLI (`agy`), sending [`messages/translation-guide.md`](../../messages/translation-guide.md) with each batch from an empty temporary directory. Plural messages are sent as `{ one, other, … }` and rebuilt from the English declarations. A translation that changes placeholders, leading or trailing spaces, or plural structure is printed and left missing. It needs a signed-in `agy`, so it runs on a developer machine; CI only runs `pnpm i18n:check`. Machine output is a draft for a fluent speaker to review.
- **Adding a language:** add the locale to `project.inlang/settings.json`, add a section to the translation guide, run `pnpm i18n:translate`, and add its Clerk localization. `pnpm i18n:check` lists anything left untranslated, and the picker names the language in itself without new messages. A right-to-left language also needs the layout checked, since only `dir` is set today.

## Hosting and security

Sessions, socket handshakes, user-generated Markdown, and uploads all need validation and abuse protection. Post and reply bodies are rendered by `MarkdownRenderer` (markdown-it) in `src/lib/markdown/`, the same way on the server and in the browser: raw HTML shows as text, links allow only `http`, `https`, `mailto`, and same-site paths, images show only their description because attachments are displayed separately, and input is bounded by the body length limits. The API sends Markdown, never HTML. The profanity filter will read code spans from the same parser. Image binaries live in their own MongoDB collection, and the 100 MB quota keeps them well inside Atlas Free's storage limit.

Free-tier limits and provider features can change, so **check them when deploying** instead of treating an old estimate as a guarantee. Secrets stay out of the repo, sample data is fictional, and setup, backup/recovery, and deployment need to be documented.
