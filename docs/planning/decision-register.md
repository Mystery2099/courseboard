# Decisions and open questions

**Last reviewed:** November 8, 2026

I want one place to check whether something is actually decided, because otherwise a suggestion from an old design conversation can quietly turn into a requirement. The [product spec](../product/product-spec.md) describes how the app behaves; this file records what I chose, why, and what I turned down. Nothing is confirmed until I've actually chosen it, and an example screen doesn't decide anything on its own.

When we settle something, add it here with what we chose, what we rejected, and why, then update the spec and any affected docs.

## Decisions we've made

| Area | What we've settled | Why it matters |
| --- | --- | --- |
| Product | Academic course discussion/review platform, not a Discord replacement | The course information needs to be useful beyond conversations |
| Professor requirements | WebSockets and Markdown | Professor Enke expects both; everything else is my own scope. See [professor approval](assignment-and-scope.md#professor-approval) |
| Navigation | Each course gets one **space** with fixed Overview, Questions, Reviews, and Discussion views; general communities are deferred | Familiar navigation without becoming a chat clone. Overview combines activity so a quieter course doesn't look empty |
| Institutions | Primary school informs discovery; multiple current/past schools supported | Institutions are metadata and filters, not navigation layers |
| History vs membership | Recording a course and following its space are independent | Following can't imply enrollment, and old courses shouldn't flood the sidebar |
| History privacy | Self-reported, **Private** by default; optional **Visible on profile** for signed-in users | No implied school verification |
| History storage | Entries live in their own `academicHistories` collection, not embedded in `users` (November 8, 2026). Changed from the approved proposal | `users` is read on every request, so embedded entries would carry private notes along unless every query projected them out. Entries also have their own visibility, repeated attempts, and review-eligibility checks. See the [MongoDB model](../technical/mongodb-model.md#why-academic-history-has-its-own-collection) |
| Grades | Deferred; private notes stay private | Neither is ever used in searches, profiles, counts, or review stats |
| Reviews | One per person per course; requires a Taking/Took entry; publishing discloses that participation after a warning | Eligibility isn't verification; each person counts once in course statistics |
| Access | Individual, single-use invitations matched to an independently verified email; no logged-out reading, including images | A forwarded link alone must never grant access |
| Authentication | Clerk through community-maintained `svelte-clerk`, email/password with required verification | Prebuilt authentication and account-management UI |
| Permissions | Regular users, per-course moderators, platform admins | Community owners can wait. Admins can't read anyone's private history or notes through the app |
| Hosting | Render Free for the app, Atlas Free for the database, Cloudflare for DNS. Served at `courseboard.mathewtech.us`, a domain I already own (November 8, 2026) | Strictly free: no payment method or overage billing. Cold starts are acceptable. My personal server stays out of it. The custom domain also makes a Clerk production instance possible |
| Client/server architecture | One repository and deployable application, explicit HTTP API, server-owned services (November 7, 2026) | Future clients could reuse the API without adding native clients or backend infrastructure to assignment scope. See [architecture](../technical/architecture.md) |
| Realtime | Socket.IO with WebSocket transport; writes go through HTTP first, MongoDB is the source of truth | An event never replaces a persisted record; reconnecting refetches |
| Images | Separate MongoDB collection, processed with Sharp; two per top-level post, 2 MB each, 100 MB total | No extra storage provider, and the quota fits well inside Atlas Free |
| Search | MongoDB text indexes plus ordinary indexes for course codes and filters | Enough for the assignment; no fuzzy matching or autocomplete yet |
| Markdown | TanStack Markdown first, markdown-it if integration gets cumbersome | Raw HTML and external images disabled |
| Profanity filter | Admin-managed list with exceptions; whole-word, case-insensitive; code exempt | Blocks submission with a clear message rather than masking or rewriting text |
| Deletion | Account deletion anonymizes retained posts and reviews as Deleted user and removes private data | Discussions stay readable without keeping private history |
| Client data | TanStack Query from the start, isolated per account | One owner for interactive server data |
| Package manager | pnpm | My preferred package manager |
| Security standard | OWASP Top 10 (2021), CSP and security headers, in-memory rate limits, `pnpm audit` in CI (November 8, 2026) | Answers the self-review security questions. See the [security and recovery plan](../technical/security-and-recovery.md) |
| Backups | Manual `mongodump` exports kept off the repository, with a tested restore (November 8, 2026) | Atlas Free has no automated backups, and the exports contain email addresses |
| Sign-in page | Briefly explains the platform and that access is by invitation (November 8, 2026) | It's the only page logged-out visitors can see |
| Visual direction | Blueprint, light/dark, Material 3 Expressive influence | Kept over a true-black/minimal style. Tokens live in the [handoff](../design/blueprint-handoff.md) |
| Typography | Space Grotesk headings, Inter UI/replies, Literata longer posts, IBM Plex Mono course codes | Don't substitute font roles arbitrarily |
| Mobile | One-row floating dock, space/channel switcher, full-screen editor | Old two-row dock designs are superseded; 360px needs to work |

## What we turned down

- **Better Auth:** replaced by Clerk to cut down on authentication and account UI work. Kinde and WorkOS AuthKit have official SvelteKit support, but I'm staying with Clerk unless integration reveals a concrete problem.
- **Clerk's own invitations:** redeeming the link verifies the email automatically, so a forwarded link would grant access. Invitations are MongoDB records instead, and redeeming one requires a normal Clerk login with the matching verified email.
- **Production MFA:** Clerk requires a paid plan for it, which conflicts with staying strictly free.
- **GridFS or object storage for images:** images are small enough for a plain collection, and object storage would add another provider.
- **Atlas Search:** deferred; text indexes cover the initial search.
- **Other Markdown libraries:** Marked doesn't sanitize its output; unified/remark/rehype needs more packages and pipeline configuration; MDsveX compiles Markdown into Svelte components, which is wrong for untrusted student posts.
- **Separate backend, microservices, multiple packages, native clients:** keeping the layers separate in one app gives the same flexibility without extra infrastructure.
- **Embedding academic history in `users`:** the approved proposal suggested it, and it would make an owner's history a single read. But a careless `find` on `users` could then return private notes, and that document is read on every request. Embedding still appears where data is small and owned by one document, such as review details on review posts.
- **Post edit history:** posts only show an edited timestamp.
- **Automated backups through GitHub Actions:** they would store user data, including email addresses, as build artifacts.

## Open questions

| ID | Question | Current leaning / what it affects |
| --- | --- | --- |
| D01 | What's the app called? | Still a placeholder; affects branding, URLs, and metadata |
| D07 | On desktop, does a new post use a dialog or a full page? | Both were explored; mobile is full screen either way |
| D13 | Do moderators need a separate escalation flow? | Reports and a course-scoped queue only; no escalation planned |
| D17 | Google login? | Undecided; email/password comes first |
| D18 | Which profanity matcher? | Leaning toward a simple whole-word matcher with no dependency |
| D19 | Image input limits | Byte and pixel limits to check before decoding, plus the resize dimensions |
| D20 | When can the hosted app come down? | At least about a month, provisionally one month after grading; confirm the date once it's known |
| D21 | Should Clerk move from its development instance to a production instance? | Leaning yes now that the app has its own domain; development instances show a badge and cap users. Needs Clerk's DNS records on `mathewtech.us` and new keys in Render |
