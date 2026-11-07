# Decisions, proposals, and things we haven't settled

**Last reviewed:** November 7, 2026

I want one place where an agent can check whether something is actually decided, because otherwise a suggestion from an old design conversation can quietly turn into a requirement. **Confirmed** means I've chosen it or it's an explicit canonical design rule; **proposed** means it's our current technical direction; **open** means we still need to decide. If Claude's handoff explicitly calls something open, don't treat an example screen as having decided it.

## Decisions we've made

| Area | What we've settled | Why it matters |
| --- | --- | --- |
| Product | Academic course discussion/review platform, not a Discord replacement | The course information needs to be useful beyond conversations |
| Navigation | Courses are **spaces** with fixed views inside them; general communities are deferred | Familiar navigation without becoming a chat clone |
| Institutions | Primary school informs discovery, multiple current/past schools supported | Institutions are metadata and filters, not navigation layers |
| History vs membership | Recording a course and joining/following its space are independent | Joining can't imply enrollment, and old courses shouldn't automatically flood the sidebar |
| History privacy | Self-reported, **Private** by default; optional **Visible on profile** for signed-in users | No implied school verification |
| Grades and notes | Always private | Don't use them in searches, profiles, counts, or review stats |
| Authentication | Clerk through community-maintained `svelte-clerk` | Confirmed provider; integration remains unverified |
| Email addresses | Personal email is fine | A school email isn't required or proof of enrollment |
| Course questions | Signed-in students can read/ask without joining or taking a course | Researching a course should be easy |
| Reviews | A self-reported Taking/Took entry is required, and publishing discloses that association after a warning | Eligibility isn't verification; disclosure confirmed November 5, 2026 |
| Course channels | Overview, Questions, Reviews, Discussion | Overview combines activity so a quieter course doesn't look empty |
| Permissions | Regular users, per-space moderators, platform admins | Community owners can wait until later |
| Visual direction | Blueprint, light/dark, Material 3 Expressive influence | Design tokens live in the handoff |
| Typography | Space Grotesk headings, Inter UI/replies, Literata longer posts, IBM Plex Mono course codes | Don't substitute font roles arbitrarily |
| Mobile | One-row floating dock, space/channel switcher, full-screen editor | Old two-row dock designs are superseded; 360px needs to work |
| Realtime | Socket updates for posts/replies, MongoDB as source of truth | Professor Enke expects WebSockets; an event doesn't replace a persisted record |
| Markdown | Markdown in posts and replies | Professor Enke treats Markdown support as a given, so it's required rather than optional polish |
| Client/server architecture | One repository and deployable application, explicit HTTP API, reusable server-owned services | Future clients can reuse capabilities without adding native clients or backend infrastructure to assignment scope |

## Authentication decision, November 5, 2026

Use Clerk through the community-maintained [Svelte Clerk SDK](https://github.com/clerk-community/svelte-clerk). This replaces the Better Auth proposal. The goal is to reduce authentication and account-management work with prebuilt UI while finishing a polished assignment.

Kinde and WorkOS AuthKit were considered for their official SvelteKit support. We chose to stay with Clerk unless initial integration reveals a concrete problem.

Clerk handles accounts and identity. MongoDB holds application profiles, academic histories, memberships, content, and application permissions, linked by Clerk user ID. The server enforces ownership, privacy, and space-scoped moderation.

The provider choice is confirmed, but the integration is not implemented or verified. First verify sign-up, sign-in, protected server routes, logout, and Socket.IO authentication.

## Technical direction, but not a promise

| Piece | Current plan | What to check before implementation |
| --- | --- | --- |
| Frontend + server | SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4 | Actual repo dependencies and runtime |
| MongoDB access | Official Node.js driver | Deployment topology, transactions, indexes, change streams |
| Realtime | Socket.IO | Persistent connection support, authentication and room permissions |
| Validation | Zod | Schemas match actual persisted data |
| UI primitives | shadcn-svelte/Bits UI, restyled for Blueprint | Compatibility and component needs |
| Shortcuts | TanStack Hotkeys | Optional; don't complicate v1 to include it |
| Tests | Vitest and Playwright | Keep the suite useful and maintainable |

## Questions to settle when they become relevant

| ID | Question | Where we're currently leaning / what it affects |
| --- | --- | --- |
| D01 | What's the app called? | Still a placeholder; affects branding, URLs, and metadata |
| D02 | Resolved: no logged-out reading | Logged-out visitors can't read course content or retrieve images |
| D03 | Resolved: past schools appear only with a visible history entry | Private entries never affect another user's institution filters |
| D04 | Resolved: yes, after a clear warning | Publishing a review discloses self-reported status and term even if the history entry stays private |
| D05 | Deferred with general communities | Course spaces don't require joining |
| D06 | Deferred with general communities | No community owners in the first build |
| D07 | On desktop, does a new post use a dialog or full page? | Both were explored |
| D08 | Resolved: separate MongoDB collection for image binaries | Two images per top-level post, 2 MB each after processing, 100 MB total quota |
| D09 | Resolved: MongoDB text indexes | Use ordinary indexes for exact course codes and structured filters; defer Atlas Search |
| D10 | Resolved: anonymize retained posts and reviews as Deleted user | Private history and profile data are removed |
| D11 | Resolved: deferred | Show an edited timestamp only |
| D12 | Deferred with online presence | No 'Here now' in the first build |
| D13 | Do moderators need a separate escalation flow in v1? | Current spec has reports and a course-scoped queue only; no escalation planned |
| D14 | Resolved: Render Free and Atlas Free, strictly free | See assignment delivery decisions below |
| D15 | Resolved: Professor Enke approved the proposal | See [professor approval](#professor-approval-november-4-5-2026) below |
| D16 | Should academic history be embedded in `users` or kept in its own collection? | The approved proposal said embedded; the current model leans separate. See the [MongoDB model](../technical/mongodb-model.md#embedding-academic-history) |

## Easy assumptions that could cause problems

The Blueprint handoff still shows member directories, 'Here now', presence dots, and community-owner permissions. Online presence and general communities are deferred, so don't bring those screens or controls into the first build just because a mockup shows them. **Realtime posts and replies matter for the lab; presence doesn't.**

When we settle a decision, record when, what we chose, what we rejected, why, and what it changes in the data model, UI, API, or tests. Please don't mark something confirmed simply because an agent prefers one option.

## Professor approval, November 4-5, 2026

- On November 3, 2026, I emailed Professor Enke a proposal: a web-based academic discussion platform loosely inspired by Discord, with academic profiles and histories, course posts, comments, profile and experience filtering, moderators and administrators, MongoDB with SvelteKit and TypeScript, embedded academic histories, and filtering, indexing, and aggregation queries.
- He replied on November 4, 2026: "Your lab sounds good!" We had already discussed it in person, where he said the proposal was good, that he expects WebSockets, and that Markdown support is a given.
- Treat WebSockets and Markdown as professor requirements. Everything else in the current spec is my own scope.
- The scope has narrowed since the proposal: general communities and Experience posts are deferred, and the history model may not end up embedded (D16). Mention these changes during the demonstration rather than presenting the original proposal as what was built.

## Assignment delivery and access decisions, November 5, 2026

These decisions supersede earlier proposals and open questions in this documentation package:

- Hosting: Render Free for the application and MongoDB Atlas Free for the database. Cloudflare remains the domain DNS provider. Hosting integration remains unverified.
- Budget: strictly free, with no payment method or overage billing. Prefer services that suspend usage at free limits. Cold starts are acceptable. Do not use the personal server.
- Scope: focus on academic courses and defer general communities. Use fictional demonstration data. WebSockets are expected by the professor; Socket.IO itself is optional.
- Access: logged-out visitors cannot read course content or retrieve uploaded images. Enforce authorization on server routes, APIs, and WebSocket subscriptions.
- Images: retain uploads in the assignment. Store small image binaries in a separate MongoDB collection and reference them from posts. Allow a couple of images per post, with compression where useful. Exact byte, dimension, and total-storage limits remain to be finalized.
- Registration: individual, single-use invitations tied to the invited verified email. Invitations expire after seven days and can be revoked and replaced. A forwarded link must not grant access without independently proving ownership of the invited email.
- Invitation administration: a minimal admin screen creates copyable links for manual delivery. Provider-native invitations are a candidate only if their verification behavior meets the access rules.
- Administrator bootstrap: explicitly configure Mathew's Clerk user ID during setup. Invitations create regular users. Only an existing administrator can grant elevated permissions.
- Demonstration: invite the professor to create his own account and prepare separate user, moderator, and administrator demo accounts.

Clerk's native invitation flow automatically verifies the invited email when its link is redeemed. Research must resolve that behavior against the requirement that forwarded links alone cannot grant access. Invitation implementation is not yet selected.

## Authentication and review refinements, November 5, 2026

- Invitations are application records in MongoDB. Redeeming one requires normal Clerk authentication and independent verification of the matching invited email. Redeem atomically. An account without application admission cannot access academic content. Do not use Clerk invitation tickets as independent email verification.
- Start with email/password and required email verification. Google login remains undecided.
- Suspension denies application requests and disconnects active WebSockets. Preserve records and content so suspension is reversible.
- Reviews include workload from 1 to 5, would-take-again yes/no, term, and written feedback.
- Allow one editable review per user per course. Repeated course attempts remain separate history entries, but each person contributes once to course statistics.
- Publishing a review discloses self-reported course status and term after a clear warning, even if its qualifying history entry is private. Grades and private notes remain private.
- Preserve published reviews and their participation snapshot if a qualifying history entry is deleted or changed to Planning. New reviews require a Taking/Took entry.
- Defer the separate Experience post type. Initial content types are Questions, Discussions, and Reviews.
- MFA: admin-required and user-optional authenticator MFA was accepted conditionally on free-plan availability, with no authenticator requirement for the professor's regular account. Research found Clerk requires a paid plan for production MFA. Resolution remains open under the strictly free constraint. Do not implement or promise production MFA yet.

## Account lifecycle and catalog decisions, November 5, 2026

- Defer MFA under the strictly free requirement. Keep Clerk with email/password and required email verification.
- Account deletion removes private academic history and profile data and anonymizes retained posts and reviews as Deleted user. Remove images attached only to deleted content. Explain retention before confirmation. Auth identity deletion and cleanup must be coordinated; retained user-authored text is not guaranteed to be free of identifying details.
- Defer previous-version access for edited posts. Show an edited timestamp. Record moderation actions with actor, target, reason, and time.
- Administrators manage the fictional institution and course catalog. Students select existing courses. Defer student course creation, course requests, and catalog imports.

## Search, editor, and discussion decisions, November 5, 2026

- People search filters by name or username, institution, course, and Taking/Took/Planning status. Academic filters and counts use only visible history. Grades and private notes never participate.
- Start with exact course-code lookup and ordinary text search. Defer typo tolerance, fuzzy matching, and autocomplete. Search implementation remains to be selected.
- Use basic Markdown input with formatting help, without a formatting toolbar or separate preview. Render formatting in published content. Keep image attachment controls separate.
- Image uploads belong to top-level posts only. Replies support text and Markdown without image uploads. Do not allow external Markdown images to bypass authenticated attachment delivery.
- Questions support one accepted reply. The question author can select, replace, or clear it. Deleting or removing that reply clears acceptance. Defer voting and reputation.
- Deleting a top-level post removes its body and attachments but preserves a Post deleted placeholder and existing replies. Exclude deleted posts from feeds, search, and review statistics. Direct links retain context.

## Upload, profile, and navigation decisions, November 5, 2026

- Upload limits: two images per top-level post; JPEG, PNG, or WebP; at most 2 MB per image after processing; 100 MB application-wide stored-image quota. Validate and process images on the server. Browser compression is optional convenience, not validation. Reject uploads clearly when the quota is full. Input byte and pixel limits remain implementation details to define before decoding.
- Profiles show the primary institution. Other institutions appear only when associated with at least one visible history entry. Private entries must not affect another user's institution filters.
- Realtime UI is limited to new-post and new-reply notices in the current view. Defer notification inboxes, cross-course unread badges, and notification emails. Authentication emails are separate.
- Defer the standalone Home feed. After sign-in, open the last-viewed course if still accessible, otherwise Explore. New users start with course discovery.
- Keep followed courses as navigation shortcuts only, independent of academic history. No combined feed or unread counters.
- Defer online presence, Focus mode, split-pane reading, and the command palette. Core screens are responsive course discovery and browsing, search, threads, profiles, academic history, and moderation.

## Image processing and draft decisions, November 5, 2026

- Automatically resize large images while preserving aspect ratio and strip metadata on the server. Do not silently crop screenshots. Explain when a processed image still exceeds the stored-image limit. Processing library and exact dimensions remain to be selected.
- Preserve unsent writing in local drafts per post or reply target, isolated by account. Clear the relevant draft after successful submission and clear account drafts on logout. Do not expose drafts to another account on the same browser.
- Research WebSocket alternatives before finalizing the library. Socket.IO remains the leading candidate, with WebSocket transport, authenticated subscriptions, and database refetch after reconnecting.

## Realtime, moderation, and identity decisions, November 5, 2026

- Use Socket.IO with WebSocket transport. Persist content through authenticated HTTP requests, then publish small realtime notices. Refetch persisted data on reconnect. Authenticate connections and authorize subscriptions on the server.
- Space moderators can lock discussions in their assigned course spaces. Locked discussions preserve existing content but reject new replies.
- Reporting covers posts and replies, with a reason and optional explanation. Provide a course-scoped moderation queue.
- Users have a unique username and a separate display name that need not be unique. Email addresses remain private.
- Add an administrator-managed short profanity list and exception list. Start with case-insensitive whole-word matching. Block publication with a clear validation message, preserve the draft, and let the author revise. Do not silently mask or rewrite text.
- Apply profanity validation to post titles and bodies, replies, usernames, and display names. Exclude private history notes, passwords, and email addresses. Harassment and contextual abuse still require reporting and moderator judgment.
- Word-list changes apply to future submissions and edits. Do not retroactively rewrite existing content. Filtering library remains to be selected after research.

## Content filtering and moderation retention, November 5, 2026

- Exempt fenced code blocks and inline code from profanity checks. Titles and ordinary prose remain checked. Code remains reportable; the exemption is not a guarantee against deliberate evasion.
- Moderator removal immediately hides content from ordinary readers, search, statistics, and image delivery. Retain the removed content for administrator review, record the reason, and allow restoration. Administrators can permanently delete it.
- Moderator removal is distinct from author deletion. Author deletion removes the body and attachments according to the previously agreed deletion policy.
- A dependency-free literal whole-word matcher is recommended for the initial profanity filter. Library selection is not a confirmed decision.

## Academic history and course views, November 5, 2026

- Allow repeated attempts at the same course as separate history entries, each with its own status, term, and visibility. Reviews remain limited to one per user per course.
- Represent terms as season and year, such as Fall 2026. A term is optional for Planning entries. Defer institution-specific academic calendars.
- Retain private history notes and defer grade entry and storage for the assignment. Previous references to optional grades describe deferred scope, not a first-release requirement.
- Keep Overview, Questions, Reviews, and Discussion as fixed course views. Overview combines activity from the other views rather than owning a separate post type. Defer configurable channels.

## Course creation and usernames, November 5, 2026

- Creating a course automatically creates its one canonical discussion space with Overview, Questions, Reviews, and Discussion. No separate space-creation workflow.
- Defer username changes. Display names remain editable.

## Design and presentation decisions, November 5, 2026

- Keep the existing Blueprint design direction rather than replacing it with the standing true-black/minimal style. Preserve its documented light/dark themes, typography, and restrained use of its established components. Scope deferrals still apply to historical artboards.
- Discussion lists default to newest activity. Questions also offer Newest and Unanswered filters. Replies remain chronological.
- Defer code syntax highlighting. Preserve whitespace and contain horizontal scrolling within code blocks.
- Other users' profiles group visible history by institution and term and show course and status. With no visible entries, show a neutral empty state without revealing whether private entries exist.
- Keep the hosted application usable for at least about one month. Planning assumption: retain availability for at least one month after grading; confirm the calendar date when known. Document export and recovery, and account for free-tier inactivity restrictions.

## Moderation and activity edge cases, November 5, 2026

- Moderators may inspect retained removed content only in their assigned courses. Only administrators can restore or permanently delete moderator-removed content. This refines the earlier administrator-review-only wording.
- Authors cannot edit moderator-removed content, but may delete it. Author deletion erases the body and attachments while preserving the moderation action record without the deleted text.
- Thread activity timestamps advance on creation and new replies, not edits, moderation actions, or accepted-answer changes.
- Anonymized reviews from deleted accounts remain in course statistics while published. Removing or deleting a review excludes it.

## Profile and onboarding decisions, November 5, 2026

- Users can hide their primary institution from their profile. Retain it privately for discovery defaults, but exclude it from other users' institution filters when hidden. This supersedes automatic public display of the primary institution.
- Authors may edit review feedback, workload, and would-take-again. Preserve the disclosed course, participation status, and term as the publication snapshot. Changing the reviewed course requires deleting and recreating the review.
- Onboarding requires username, display name, and primary institution. Academic history and course following remain optional. Do not require a photo or bio.
- Use initials with a consistent generated color for avatars. Defer avatar uploads.

## Dependency decisions, November 5, 2026

- Use pnpm rather than Bun as the package manager. This does not itself choose the production JavaScript runtime.
- Confirm Zod for request validation and inferred application types.
- Confirm Sharp for server-side image processing.
- Use MongoDB text indexes for initial full-text search and ordinary indexes for exact course-code lookups and structured filters. Defer MongoDB Search/Atlas Search.
- Markdown library remains under evaluation, explicitly including TanStack Markdown alongside markdown-it, Marked, unified/remark, and Svelte-specific options. Do not assume markdown-it has been selected.

## Markdown choice and performance, November 5, 2026

- Try TanStack Markdown first. Switch to markdown-it if integration, syntax compatibility, or security-policy customization becomes cumbersome. No requirement to retain TanStack at the expense of simplicity.
- Performance is an explicit priority. Evaluate dependencies by browser cost, runtime work, and implementation complexity. Integration and actual application performance remain unverified.

## UI dependency direction, November 5, 2026

- Use Tailwind CSS, Bits UI, selective shadcn-svelte components customized for Blueprint, and Lucide icons imported individually.
- Use TanStack Query from the start for client-side server-data caching and Zod for boundary validation. Form actions may remain web adapters; the November 7 client/server decision requires a client-independent HTTP API for core operations. Defer Superforms until a concrete workflow justifies it. Avoid competing sources of truth for the same client data.
- TanStack Virtual and TanStack Table are potentially useful, optional dependencies. Evaluate Virtual for measured long-list rendering bottlenecks and Table for admin tables that need sorting or filtering. Do not add either automatically.

## Client data caching decision, November 5, 2026

Use TanStack Query from the start. Query owns the client cache for interactive server data such as course lists, threads, and replies, fetched through the HTTP API. SvelteKit handles routing and initial loading where appropriate; web loads and optional form actions use the same application services as API handlers. Initial data for Query-managed views must feed the same cache rather than create a competing mutable store.

Use targeted cache updates or invalidation after successful writes. Incoming socket notices must preserve the agreed new-item notice behavior rather than immediately reorder visible lists. On reconnect, refetch relevant persisted data. Isolate caches by authenticated account, clear them on logout/account changes, and never share a user's server-side QueryClient across requests. Authorization remains server-side regardless of cached data.

TanStack Virtual and TanStack Table remain optional candidates, not initial installation requirements. Performance and feature needs determine adoption.

## Performance and access refinements, November 5, 2026

- Prioritize low memory usage, fast transitions and loading, and perceived responsiveness. Evaluate with realistic seeded content on modest devices. Cold starts remain the accepted free-hosting exception. Do not optimize primarily for hypothetical concurrent-user scale.
- Image processing prioritizes readable screenshots and diagrams over aggressive compression. Preserve aspect ratio and text clarity while enforcing stored-image limits.
- Platform administrators cannot inspect another user's private history or private notes through application endpoints. Administrative roles do not bypass owner-only access. This is an application permission rule, not a claim that database operators cannot access stored data.
- Invitation email matching applies at admission. Later verified email changes preserve admission through the same Clerk user ID. Suspension and roles remain attached to that identity.
- At the image quota, preserve existing content and reject new uploads clearly. Give administrators storage usage and authorized deletion controls. Do not automatically delete published images. This is the accepted initial quota behavior.

## Pagination and perceived performance, November 5, 2026

- Use automatic infinite scrolling for course and post browsing lists, with a visible Load more fallback and bounded database pagination.
- Use explicit Load more for replies inside discussion threads. Preserve reading position and avoid incoming-content jumps.
- Use TanStack Virtual for browsing lists when list growth warrants it. It limits rendered elements, not fetched/cached data. Bound retained Query pages separately to control memory, and verify navigation/scroll restoration with page eviction. This refines Virtual's optional status for the browsing workflow; it is not a requirement to virtualize every list.
- Show a clearly marked pending reply immediately during submission. On failure, preserve the text with Retry. Reviews, moderation actions, and permission changes wait for server confirmation. Ensure retries cannot duplicate an already accepted reply.
- Within the same admitted account, display cached content while refreshing and reconcile changes afterward. Show a quiet refresh/error indication. Cached content never authorizes actions. Clear caches on logout/account changes.
- Show static skeletons only when no content is available. Avoid shimmer/pulse animation and preserve content dimensions to reduce layout jumps.

## Client/server architecture decision, November 7, 2026

- Confirmed: one repository, one deployable application, clear client/server responsibilities, and an explicit HTTP API for core reads and writes. Keep SvelteKit as the web/server host.
- Rationale: future mobile/desktop clients should reuse server capabilities without depending on web-page form submissions. Only the web client is in assignment scope.
- Application services own business rules and permissions; repositories own persistence. HTTP handlers, web loads/form actions, and realtime adapters reuse those rules. Server-rendered pages may call services directly without loopback HTTP.
- Share deliberate request/response contracts where useful, not MongoDB documents or server internals. Clients own presentation and interaction, never database access or authorization decisions.
- Persist changes through authenticated HTTP and publish authorized Socket.IO notices afterward, using the same permission policy.
- Rejected for now: separate backend frameworks/deployments, microservices, speculative package splitting, and implementing native clients. Logical boundaries provide flexibility without extra infrastructure.
- Implementation impact: add domain endpoints as features are built. Invitation operations now have service-backed HTTP endpoints alongside thin web adapters, client-safe contracts, and shared access policy. Focused tests cover service rules and direct API handlers independently of the UI; hosted integration remains unverified. No data-model or visual redesign is required.

See [technical architecture](../technical/architecture.md#confirmed-clientserver-decision-november-7-2026) for responsibilities and implementation gaps.
