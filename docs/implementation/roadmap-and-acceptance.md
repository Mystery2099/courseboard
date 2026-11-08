# Build plan and acceptance

**Status:** Plan, November 8, 2026. No implementation or deployment has been verified. Use the [product spec](../product/product-spec.md) for confirmed behavior and the [lab checklist](../course/lab-checklist.md) for what every lab needs before submission.

## Stage 0: prove the infrastructure

- [x] Confirm requirements with Professor Enke. He approved the proposal on November 4, 2026, expects WebSockets, and treats Markdown as a given.
- [ ] Decide whether academic history is embedded in `users` or kept in its own collection (D16).
- [ ] Revise the needs assessment to match the current scope, keeping the original as the first version. Lead with the underlying problem rather than its symptoms, and explain what changed since the proposal and why.
- [ ] Write the security and data recovery plan (a course objective): risks mapped to the OWASP Top 10, security headers and CSP, rate limits on invitation redemption, uploads, and posting, dependency auditing, secrets handling, and how MongoDB data is backed up and restored on Atlas Free.
- [ ] Verify Render Free, Atlas Free, and Clerk work without payment details or billable services.
- [ ] Prove Clerk sign-up, verification, sign-in, protected server routes, logout, and authenticated Socket.IO connections on the deployed host.
- [ ] Prove application invitation redemption with independent verified-email matching, expiration, revocation, and single-use enforcement.
- [ ] Set up TanStack Query with account-isolated caching, request-scoped SSR clients, and one owner for interactive server data. Verify initial-data integration and targeted invalidation.
- [ ] Bootstrap the administrator and link MongoDB profiles through unique Clerk user IDs.
- [ ] Prove a processed image upload and authorized retrieval through the hosted application.
- [ ] Verify MongoDB text search, Zod, Sharp, and TanStack Markdown (markdown-it as fallback). Use pnpm. Define image input byte and pixel limits.
- [x] Build invitations as the first feature on the client/server structure: HTTP endpoints, application services, and repositories, with web pages calling the same services. Services and route handlers have tests; the hosted checks above still apply.

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
- [ ] Verify privacy and permissions with separate accounts. At minimum:
  - Another student can't retrieve my private course or note through a direct ID, profile, search result, or statistic, and neither can an administrator.
  - Following a course doesn't create a history entry or expose one that already exists, and publishing a review doesn't change a history entry's visibility.
  - A `Planning` entry can't be used to publish a review.
  - A forged request or socket message can't grant moderation rights, and a moderator in one course can't moderate another.
  - A logged-out visitor, or a signed-in account without admission, can't load a course page, API response, image, or socket subscription. A forwarded invitation link doesn't get around this.
  - User Markdown or image metadata can't inject scripts into another person's browser.
- [ ] Make the sign-in page explain what the platform is for, since logged-out visitors can't see anything else, and give new users enough guidance to find courses, record history, and post.
- [ ] Run a few informal usability checks with students, mainly searching for a course, editing history, and posting on a phone.
- [ ] Self-review the app with the [self-review questions](../course/lab-self-review-questions.md) after first using it and again after several sessions. Record each peer evaluation with my response and what I changed.
- [ ] Document setup, environment variables, deployment, free-tier limits, and demonstration accounts. Test a restore from backup at least once.
- [ ] Invite the professor and prepare a repeatable demonstration of documents, indexes, filtering, aggregation, WebSockets, images, and administrative roles.
- [ ] Demonstrate to Professor Enke, then submit through Blackboard with a cover page (my name, the professor's name, and a description of the lab). The syllabus allows at most two submissions a week, so plan around other assignments.

