# Technical architecture — current plan

> Scope update, November 5, 2026: the [current product spec](../product/product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

**This is still a plan, not a description of a verified implementation.** I want something relatively straightforward to build and maintain, with the database and security responsibilities separated clearly enough that agents can work on different parts without tangling everything together. Check the actual repository before treating any of this as an existing module layout.

## Stack I'm leaning toward

| Part | Current choice | Notes |
| --- | --- | --- |
| Frontend/server | SvelteKit 2, Svelte 5, TypeScript | The main web app and its server-side routes |
| Styling/UI | Tailwind CSS 4, shadcn-svelte/Bits UI | Restyled around Claude's Blueprint system |
| Authentication | Clerk through community-maintained `svelte-clerk` | Confirmed choice; integration and session behavior remain unverified |
| Database | MongoDB, official Node.js driver | The database this lab is meant to demonstrate |
| Validation | Zod | Confirmed; infer types from boundary schemas |
| Realtime | Socket.IO with WebSocket transport | Professor Enke expects WebSockets; posts/replies update without refresh |
| Testing | Vitest and Playwright | Focus on useful behavior, especially privacy and authorization |
| Client data | TanStack Query | Owns the client cache for interactive server data |
| Markdown | TanStack Markdown, with markdown-it as fallback | Markdown is a professor expectation |
| Images | Sharp, MongoDB `images` collection | Server-side processing and authorized delivery |
| Shortcuts | TanStack Hotkeys | Optional UI convenience, deferred with the command palette |

The supplied NoSQL planning materials don't establish exact dependency versions, an implemented repository, a deployed site, or a hosting account. Those should be checked, not guessed.

## Authentication boundary

Clerk handles credentials and account identity through the community-maintained [Svelte Clerk SDK](https://github.com/clerk-community/svelte-clerk). Use its prebuilt authentication and account-management UI to reduce implementation work.

MongoDB stores application profiles and domain data, linked by a unique Clerk user ID. Application roles, moderator assignments, and history privacy remain server-enforced application rules.

Verify sign-up, sign-in, protected server routes, logout, and Socket.IO authentication before building dependent features. Decide how application profiles are created and how account changes and deletion are synchronized during integration. These flows remain unverified in this repository.

## Confirmed tooling updates

Use pnpm instead of Bun. Use Sharp for server-side images. Initial search uses MongoDB text indexes plus ordinary indexes for course codes and structured filters. Try TanStack Markdown first and fall back to markdown-it. These choices remain unverified in a deployed application.

## Overall shape

### Confirmed client/server decision, November 7, 2026

Use one repository and one deployable application with clearly separated client/server responsibilities and an explicit HTTP API for core application reads and writes. Keep SvelteKit as the web/server host. Future mobile or desktop clients should use the same API and realtime contracts without imitating web-page form submissions. Only the web client is in assignment scope.

This does not require a separate backend framework, separate deployments, microservices, or a speculative package split. The boundary is logical, not an infrastructure requirement.

- Clients own presentation and interaction. They never access MongoDB directly or decide authorization.
- Application services own business rules and permission enforcement, including admission, review eligibility, privacy, and moderation. Accept authenticated application identity/context rather than page events or form data.
- HTTP handlers validate transport inputs and translate service results into explicit response models and errors. Repositories own persistence queries and mappings.
- Expose core operations through client-independent HTTP endpoints as features are built. Web loads and optional form actions remain thin adapters to the same services, not the only interface to core functionality or a second implementation of its rules.
- Server-rendered pages may call services directly without making loopback HTTP requests to their own API.
- Share request/response schemas and types where useful, not MongoDB documents or server internals. Return deliberately serialized, privacy-aware response fields rather than raw database records.
- Socket authentication and subscriptions reuse the same server-owned permission policy. Persist changes through authenticated HTTP, then emit authorized notices; realtime is not a competing business-rule or persistence path.

**Current implementation:** `src/lib/server/` separates services, repositories, access policy, and persistence. Invitation listing, creation, revocation, and redemption have HTTP endpoints backed by the same admission service as the web loads/actions. Services enforce administration permissions, HTTP and realtime share account-access policy, and `src/lib/contracts/InvitationContract.ts` defines client-safe invitation inputs and response types. Dates cross this boundary as ISO strings. Focused tests cover service access and direct route handlers; deployed authentication and end-to-end integration remain unverified. Other domain APIs will be added with their features.

### Invitation HTTP API

| Method and path | Access | Result |
| --- | --- | --- |
| `GET /api/invitations` | Active administrator | Bounded pending/recent-closed lists, with `hasMorePendingInvitations` |
| `POST /api/invitations` | Active administrator | JSON `{ email }`; returns token, email, and ISO expiry with status 201 |
| `POST /api/invitations/{invitationId}/revoke` | Active administrator | JSON `{}`; returns `{ revoked: true }`, or 409 when unavailable |
| `POST /api/invitations/redeem` | Signed-in identity; admission not required | JSON `{ token }`; returns `{ kind: 'admitted' }` or `{ kind: 'already-admitted' }` |

Authentication uses the existing Clerk request middleware; actor identity and roles are never taken from request bodies. Writes require `application/json` and reject a supplied Origin that differs from the request origin. No cross-origin browser API access is enabled. Native-client authentication remains to be integration-tested; these endpoints do not imply a native client exists.

Route-handler errors use `{ error: { code, message } }`: 400 for invalid input/JSON, 401 for missing identity, 403 for denied access or redemption email mismatch, 409 for revocation conflicts, 410 for unavailable redemption, 415 for non-JSON writes, and a generic 500 for unexpected failures. Responses use `Cache-Control: no-store`, including the one-time creation token. Creation returns the token rather than a host-specific URL; the web adapter constructs the invitation link. Framework/middleware failures before the handlers are outside this error contract.

### Deployment context

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

I don't want Svelte components deciding whether a user can access somebody else's history, and I don't want WebSocket state becoming a second, competing database. The server validates changes and stores them, then sends clients the information they're allowed to see. If a client reconnects or misses an event, it can get the real state back from MongoDB.

The [diagrams](diagrams.md) show the system context, request checks, admission, and the realtime write path in more detail.

## Boundaries I'd like to keep

The exact folder names can change, but the responsibilities shouldn't all end up mashed into one file. Authentication handles sessions, admission, and invitations; the catalog handles institutions and courses; histories handle ownership, eligibility, and privacy; spaces handle following and course views. Posts and replies belong to content services, while discovery handles searches, statistics owns aggregation pipelines, moderation handles reports and scoped privileges, realtime handles sockets and subscriptions, and media handles validated uploads and quota.

I care more about those **clean seams** than whether somebody names the directory `services`, `modules`, or something else. An agent should be able to implement a feature without rewriting unrelated layers, and the permission rules should be in shared server code rather than copied across page components.

## How realtime should work

After a post or reply is successfully stored, the app can send a small event such as `post.created` or `reply.created` to listeners who are allowed to see it. MongoDB change streams might help, but **don't assume they're available**: the deployment has to support the necessary topology, and any transaction/change-stream choice should be verified before depending on it. Directly publishing from the server service is also an option, but we'd need to think about retries and multiple app instances if we go that route.

The browser shouldn't be able to pick someone else's identity or permissions through an event payload. Incoming items should show up through a notice instead of suddenly rearranging the feed while someone is reading, and reconnection should refetch missed changes. Online presence is deferred.

## MongoDB deserves deliberate design

The point of using MongoDB isn't to force every relationship into an embedded array. We should look at how the app actually queries histories, reviews, memberships, and posts, then decide where embedding makes sense and where a separate collection is cleaner. Unique constraints and compound indexes should protect meaningful identities and support real queries, while review statistics should be built from published review data rather than private grades or course histories.

Anything involving several documents may need a consistency strategy, and transactions/change streams depend on the MongoDB environment. Don't write unbounded queries based on user input, and don't pull private records into application memory only to filter them at the very end.

## Hosting, storage, and security

Sessions, socket handshakes, user-generated Markdown, and uploads all need appropriate validation and abuse protections. Image binaries go in their own MongoDB collection, which avoids adding another storage provider. A 100 MB quota keeps them well inside Atlas Free's storage limit. Images are served only through endpoints that check access.

We also need a deployment that actually supports persistent Socket.IO connections, along with whatever MongoDB capabilities we decide to rely on. Free-tier limits and provider features can change, so **check them when deploying** instead of treating an old estimate as a guarantee. Secrets stay out of the repo, sample data should be fictional, and we need some kind of documented setup, backup/recovery, and hosted verification process.

## Markdown candidates reviewed, November 5, 2026

Professor Enke treats Markdown support as a given. Whichever library we use must enforce attachment-only images, safe links, disabled raw HTML, bounded input, and the profanity filter's code exemptions.

- [TanStack Markdown](https://tanstack.com/markdown/latest/docs/overview): zero-runtime-dependency parser and HTML renderer, serializable syntax tree, escaped raw HTML and unsafe URL filtering by default. React and Octane adapters exist; Svelte can use the framework-independent HTML path. Deliberately incomplete CommonMark/GFM coverage and a narrower extension surface. Promising for the selected basic syntax; validate attachment policy and untrusted-input behavior before selection.
- [markdown-it](https://github.com/markdown-it/markdown-it/blob/master/docs/safety.md): established configurable parser with tokens, renderer rules, and raw HTML disabled by default. A strong fallback for predictable user-authored Markdown and custom image rules.
- [Marked](https://marked.js.org/): compact general parser with token/renderer customization. Does not sanitize its HTML output, so it needs an explicit sanitization policy and additional integration work.
- [unified/remark/rehype](https://github.com/remarkjs/remark-rehype): flexible syntax-tree processing and explicit sanitization through rehype-sanitize, at the cost of more packages and pipeline configuration.
- [MDsveX](https://github.com/pngwn/MDsveX): Markdown-to-Svelte preprocessor for authored application content. Its component-compilation role is inappropriate for untrusted student posts.

Decision: try TanStack Markdown first and switch to markdown-it if integration, syntax compatibility, or security policy becomes cumbersome. No library has been installed or benchmarked in this repository yet.

## Client data ownership

Use TanStack Query from the start for interactive server-data caching, fetching core application data through the HTTP API. SvelteKit handles routing and initial data loading where appropriate. Server loads and optional form actions remain thin adapters to the same application services used by API handlers, with Zod boundary validation. Feed initial data into the Query cache for Query-managed views instead of keeping two independently mutable copies. Verify the selected Svelte adapter's SSR integration before implementation.

Target cache updates or invalidation after writes. Socket events queue new-item notices without shifting content under readers. Refetch relevant data after reconnecting. Keep caches isolated by account, clear on logout/account changes, and scope server-side QueryClient instances to individual requests. Cached data never replaces authorization.

Potential additions, only when justified:

- TanStack Virtual for long lists with measured rendering costs. Pagination remains necessary independently of virtualization.
- TanStack Table for admin data tables needing sorting/filtering. Plain semantic tables remain sufficient for simple views.
- Superforms if repeated form-state and validation plumbing becomes substantial.

## Bounded browsing lists

Use infinite scrolling with a Load more fallback for course/post lists and explicit Load more for thread replies. Use TanStack Virtual where growing browsing lists justify virtualization. Bound Query's retained pages independently, preserve navigation position, and test restoration after page eviction. Initial empty-cache loading uses static skeletons. Same-account cached content stays visible during refresh.

Pending replies need a stable submission identity so Retry does not duplicate a reply already stored before a lost response. Keep privileged actions and reviews confirmed by the server before presenting success.
