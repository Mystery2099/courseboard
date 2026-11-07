# Build plan and acceptance

**Status:** Plan, November 5, 2026. No implementation or deployment has been verified. Use the [product spec](../product/product-spec.md) for confirmed behavior.

## Stage 0: prove the infrastructure

- [x] Confirm requirements with Professor Enke. He approved the proposal on November 4, 2026, expects WebSockets, and treats Markdown as a given.
- [ ] Decide whether academic history is embedded in `users` or kept in its own collection (D16).
- [ ] Verify Render Free, Atlas Free, and Clerk work without payment details or billable services.
- [ ] Prove Clerk sign-up, verification, sign-in, protected server routes, logout, and authenticated Socket.IO connections on the deployed host.
- [ ] Prove application invitation redemption with independent verified-email matching, expiration, revocation, and single-use enforcement.
- [ ] Set up TanStack Query with account-isolated caching, request-scoped SSR clients, and one owner for interactive server data. Verify initial-data integration and targeted invalidation.
- [ ] Bootstrap the administrator and link MongoDB profiles through unique Clerk user IDs.
- [ ] Prove a processed image upload and authorized retrieval through the hosted application.
- [ ] Verify MongoDB text search, Zod, Sharp, and TanStack Markdown (markdown-it as fallback). Use pnpm. Define image input byte and pixel limits.
- [ ] Present static UI alternatives for selection before implementing nontrivial interface changes.
- [x] Establish the invitation reference boundary: client-independent HTTP contracts, thin transport adapters, service-owned permissions/listing, and persistence repositories in one deployable application. Page loads/actions call the same services directly. Focused service and route-handler tests cover the boundary; hosted integration is still a separate Stage 0 check.

## Stage 1: finish one course workflow

- [ ] Seed fictional institutions, courses, histories, roles, and content repeatably. Course creation automatically creates its canonical space.
- [ ] Implement primary-institution onboarding, unique usernames, editable display names, course discovery, following, and last-course navigation.
- [ ] Implement private-by-default history entries, repeated attempts, season/year terms, private notes, and profile visibility.
- [ ] Implement questions, discussions, one-level replies, accepted answers, and locked discussions.
- [ ] Verify that membership, history, and content remain independent and unauthorized reads/writes fail on the server.
- [ ] Expose core workflow reads/writes through the HTTP API without requiring web-page form submissions. Test service rules and direct authorized/unauthorized API requests independently of the UI. Web adapters reuse those services; native mobile/desktop clients are not required.

## Stage 2: reviews and discovery

- [ ] Implement one review per user/course, Taking/Took eligibility, disclosure warning, and publication-time participation snapshot.
- [ ] Aggregate review count, workload, and would-take-again results from published nonremoved reviews.
- [ ] Implement course/post search and privacy-safe people filtering with stable bounded pagination.
- [ ] Inspect actual query plans and add indexes for demonstrated query shapes.
- [ ] Verify that private records never affect another user's matches, snippets, counts, or statistics.

## Stage 3: content safety and realtime

- [ ] Implement safe Markdown rendering, formatting help, and account-isolated local drafts without a toolbar or preview.
- [ ] Implement two-image post attachments, server validation/processing, metadata stripping, authorized delivery, and atomic quota enforcement.
- [ ] Implement reports, scoped moderation, locking, removal/restoration, audit records, and suspension with active socket disconnection.
- [ ] Implement administrator-managed profanity terms/exceptions and code exemptions.
- [ ] Publish persisted changes through Socket.IO WebSockets, buffer new-item notices, and refetch on reconnect.
- [ ] Implement author deletion and coordinated account deletion, including private data cleanup and documented retained content.

## Stage 4: polish and demonstrate

- [ ] Verify core flows at 360 × 640, larger phones, tablet, and desktop with keyboard and touch access.
- [ ] Complete loading, empty, offline, validation, permission, upload-failure, and failed-submission states.
- [ ] Verify separate-account privacy, invitation bypass attempts, forged moderation requests, direct image access, and socket authorization.
- [ ] Document setup, environment variables, backup/recovery, deployment, free-tier limits, and demonstration accounts.
- [ ] Invite the professor and prepare a repeatable demonstration of documents, indexes, filtering, aggregation, WebSockets, images, and administrative roles.
- [ ] Demonstrate to Professor Enke, then submit through Blackboard as instructed.

## Deferred

General communities, Experience posts, grade storage, Home feed, presence, notification inboxes/emails, cross-course unread counters, Focus, split-pane reading, command palette, username changes, post-version history, configurable channels, student-created courses, imports, voting, reputation, fuzzy search, autocomplete, and MFA. Google login remains undecided.

## Session reporting

Report what changed, validation performed, what is usable, and remaining blockers. Distinguish plans, mockups, and unverified integrations from implemented behavior.
