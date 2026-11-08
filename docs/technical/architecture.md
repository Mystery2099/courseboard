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

**Current implementation:** `src/lib/server/` separates services, repositories, access policy, and persistence. Invitations were the first feature built this way, followed by the course catalog and following, onboarding and profiles, then academic history. Each has HTTP endpoints that use the same services as the web pages. HTTP and realtime share the same account-access checks, and `src/lib/contracts/` defines the request and response types the client sees. Dates are sent as ISO strings. Other APIs will be added along with their features.

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
| `GET /api/profile` | Admitted user | The caller's username, display name, and primary institution, or 409 `onboarding-required` |
| `POST /api/profile` | Admitted user | JSON `{ primaryInstitutionId, username, displayName }`; completes onboarding with status 201. 409 when the username is taken or the profile already exists, 404 for an unknown institution |
| `PATCH /api/profile` | Admitted user with a profile | JSON `{ displayName }`; returns the updated profile. The username can't be changed |

An admitted account without a profile is sent to onboarding by every web page. On a fresh database there are no schools to choose, so onboarding offers administrators the demo catalog load that otherwise lives under **Admin → Course catalog**. Usernames are lowercase, unique, and can't be changed; a few names that look like staff or system accounts are reserved.

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

`status` is `planning`, `taking`, or `took`; `term` is `{ season, year }` with `season` one of `winter`, `spring`, `summer`, `fall`, and only Planning may send `null`. Another user's entry answers 404 exactly like a missing one. Someone with only private entries looks the same as someone with none, and administrators get no exception.

Following never reads or writes academic history. After a course page renders, the browser records it as the user's last visited course; it isn't recorded during the server load, so hover preloading doesn't count as a visit. `/` resumes that course after sign-in when it still exists.

Errors use `{ error: { code, message } }`: 400 for invalid input/JSON, 401 for missing identity, 403 for denied access or redemption email mismatch, 404 for an unknown course or institution, 409 for revocation conflicts, 410 for unavailable redemption, 415 for non-JSON writes, and a generic 500 for unexpected failures. Responses use `Cache-Control: no-store`, including the one-time creation token. Creation returns the token rather than a host-specific URL; the web page builds the invitation link.

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

**Current implementation:** the root layout creates the `QueryClient`, so each server render gets its own and each browser tab keeps one. Queries don't run during server rendering; a page's server load supplies `initialData` with its load time as `initialDataUpdatedAt`, and the query owns the data from then on. `AccountScopedQueryCache` clears the cache when the Clerk user changes, including sign-out. Browser API calls go through `src/lib/client/`, which also defines query keys. Academic history is the first view built this way: writes invalidate every `academic-history` key, which covers the owner's list and Preview as others. The course picker uses an infinite query over the course browse API.

Use TanStack Virtual for browsing lists once they grow enough to need it. Virtualization limits rendered elements, not fetched data, so bound Query's retained pages separately and test scroll restoration after old pages are evicted. Pending replies need a stable submission ID so Retry can't duplicate a reply that was stored before a lost response.

TanStack Table and Superforms are possible later additions, only if admin tables or form handling actually need them.

## Hosting and security

Sessions, socket handshakes, user-generated Markdown, and uploads all need validation and abuse protection. The Markdown renderer must allow only attachment images, safe links, no raw HTML, bounded input, and the profanity filter's code exemptions. Image binaries live in their own MongoDB collection, and the 100 MB quota keeps them well inside Atlas Free's storage limit.

Free-tier limits and provider features can change, so **check them when deploying** instead of treating an old estimate as a guarantee. Secrets stay out of the repo, sample data is fictional, and setup, backup/recovery, and deployment need to be documented.
