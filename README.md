# Academic Discussion Platform

**Course:** CISY 8503, Applied Database Management  
**Assignment:** NoSQL Database Lab 1  
**Name:** Still a working title  
**Status:** Planning and design. Professor Enke approved the proposal on November 4, 2026. The application hasn't been implemented yet.  
**Last documentation review:** November 5, 2026

For my NoSQL lab, I'm building a course-focused discussion platform where students can keep track of their academic histories, ask questions, discuss classes, and share structured reviews. Discord inspired some of the navigation, but the academic information should stay useful outside an active conversation.

My goal is to finish a polished assignment without turning it into an entire social network. MongoDB needs to do meaningful work: storing academic records, supporting privacy-aware filtering, indexing real queries, and calculating review statistics. Professor Enke expects WebSockets, so the demonstration should show updates across browser sessions after the data is saved. He also treats Markdown support as a given.

## What I'm building first

Students get access through individual invitations tied to a verified email address. Once admitted, they can browse courses, follow them for navigation, record their own history, and participate in discussions. Logged-out visitors can't read course content or retrieve uploaded images.

Every course belongs to an institution and gets one discussion space with Overview, Questions, Reviews, and Discussion. Overview combines activity from the other views. Following a course, recording it in your history, and publishing something about it are separate actions. None of them should silently change the others.

The first build includes:

- Private-by-default history entries with Planning, Taking, or Took status, season/year terms, repeated attempts, and private notes.
- Profiles that expose only the academic information someone chooses to share. Grades are deferred.
- Questions, discussions, one-level replies, and an accepted answer selected by the question's author.
- One editable review per person per course, with workload, term, whether they'd take it again, and written feedback. Reviews disclose self-reported participation after a warning, even if the history entry stays private.
- Course and post search, plus people filtering that never uses hidden history in matches, snippets, or counts.
- Small image attachments on top-level posts, safe Markdown rendering, and local draft recovery.
- Reports, course-scoped moderators, discussion locking, platform administrators, and an admin-managed profanity list with exceptions for code.
- WebSocket-backed new-item notices that don't shift content while someone is reading.

Signing in resumes the last accessible course, with Explore as the fallback. Followed courses are shortcuts rather than a combined Home feed. Browsing lists use infinite scrolling with a Load more fallback; replies use explicit Load more.

General communities, Experience posts, presence, a notification inbox, Focus mode, split-pane reading, the command palette, and code highlighting can wait. DMs, voice/video, bots, and verified enrollment aren't part of this assignment. The [product spec](docs/product/product-spec.md) has the detailed behavior and deletion rules.

## Tools we've chosen

These are decisions for the implementation, not a list of integrations that already work.

| Part | Choice | Why I'm using it |
| --- | --- | --- |
| Application | SvelteKit, Svelte, TypeScript | The web app and its server-side routes |
| Package manager | pnpm | Use this instead of the earlier Bun plan |
| Authentication | Clerk through community-maintained `svelte-clerk` | Prebuilt authentication and account-management UI |
| Database | MongoDB Atlas Free, official Node.js driver | The database this lab is meant to demonstrate |
| Validation | Zod | Validate boundary inputs and infer types from schemas |
| Client data | TanStack Query | Cache interactive server data from the start |
| Realtime | Socket.IO with WebSocket transport | Authenticated course/thread subscriptions and reconnect handling |
| Markdown | TanStack Markdown | Try this first; switch to markdown-it if integration becomes cumbersome |
| Images | Sharp, binary storage in a separate MongoDB collection | Process small attachments without adding another storage provider |
| UI | Tailwind CSS, Bits UI, selected shadcn-svelte components, Lucide | Build the Blueprint interface with accessible behavior |
| Hosting | Render Free | Run the application separately from Atlas and my personal server |
| Search | MongoDB text indexes and ordinary indexes | Basic text search, exact course-code lookup, and structured filters |

TanStack Virtual is available for growing browsing lists where virtualization helps. It doesn't limit cached data, so we'll bound retained pages separately. TanStack Table is a possible addition for richer admin tables. Superforms can wait until form handling actually needs it.

Exact versions, the production runtime, and the deployed integrations still need checking. Clerk's Svelte integration is community-maintained, and production MFA requires a paid plan, so MFA is deferred. Google login is still undecided.

## Client/server architecture

The confirmed direction is one repository and one deployable application with a clear client/server boundary. Core reads and writes have an explicit HTTP API backed by reusable application services and persistence repositories. The server owns business rules, permissions, validation, and database access; clients own presentation and interaction. Web loads and optional form actions reuse those services, and server-rendered pages can call them directly without loopback HTTP.

Future mobile or desktop clients should reuse the same API and realtime contracts, but only the web client is in assignment scope. No separate backend framework, deployment, microservices, or speculative package split is needed. Invitations now have service-backed HTTP endpoints alongside the web handlers, shared request/response contracts, and transport-independent access checks. Direct-handler tests do not establish deployed authentication or native-client integration. See the [architecture decision and API](docs/technical/architecture.md#confirmed-clientserver-decision-november-7-2026).

## Performance, privacy, and free hosting

I care about low memory usage, fast transitions and loading, and perceived responsiveness. Show cached content while refreshing, use static skeletons when there's nothing to show, and avoid shimmer or pulse animations. Keep queries and responses bounded, preserve reading position, and don't let infinite scrolling grow memory indefinitely.

The design stays **Blueprint**, including its light/dark themes and typography. The simplified scope doesn't mean replacing the design with a different visual system.

Everything must stay free, without a payment method or overage billing. Render's cold starts are an accepted tradeoff. Cloudflare stays the DNS provider for my domain; the application doesn't need to run there. Plan to keep the site usable for at least about a month, provisionally a month after grading.

Images are limited to two per post, at most 2 MB each after processing, with a 100 MB application-wide image quota. Process them on the server, strip metadata, and preserve readable screenshots. At the quota, existing content keeps working and new uploads fail clearly. Image delivery checks access just like other content.

Clerk handles identity, while MongoDB stores application admission, profiles, academic records, content, and permissions. A Clerk account alone doesn't grant application access. Server checks apply to routes, APIs, images, and sockets. Administrators don't get permission to read another student's private history or notes through the app.

## Where to start

Read the [decision register](docs/planning/decision-register.md) and [product spec](docs/product/product-spec.md) first. They capture the choices we've made during planning. The [roadmap](docs/implementation/roadmap-and-acceptance.md) turns those decisions into build stages and acceptance checks.

The repository contains planning documents, assignment materials, design exports, and an application scaffold. The scaffold isn't a working product yet: it wires up configuration, the MongoDB connection, Clerk, and the Socket.IO attachment, with no domain features.

To run it locally, copy `.env.example` to `.env`, fill in Clerk and MongoDB values, then run `pnpm install` and `pnpm dev`. For production, use `pnpm build` and `pnpm start`; `render.yaml` describes the Render service. GitHub Actions runs linting, type checks, server tests, and the build on every pull request and push to `master`; Render deploys `master` only after those checks pass. `GET /api/health` reports whether MongoDB is reachable. The first implementation step is to prove the hosted combination of Clerk, SvelteKit, Socket.IO, Atlas, and one protected image upload before building dependent screens.

| Document | What it's for |
| --- | --- |
| [Assignment and scope](docs/planning/assignment-and-scope.md) | The lab requirements and the distinction between required and added features |
| [Decision register](docs/planning/decision-register.md) | Confirmed decisions, their rationale, and remaining questions |
| [Needs assessment](docs/planning/needs-assessment.md) | The reasoning behind the original project plan |
| [Product spec](docs/product/product-spec.md) | Current behavior, privacy, moderation, and first-release scope |
| [Privacy and permissions](docs/product/privacy-and-permissions.md) | Privacy boundaries and role rules, with older scope subject to the current spec |
| [Architecture](docs/technical/architecture.md) | Application responsibilities, dependency research, caching, and realtime behavior |
| [MongoDB model](docs/technical/mongodb-model.md) | Candidate documents, indexes, queries, and aggregation work |
| [Diagrams](docs/technical/diagrams.md) | System context, collections, request checks, admission, realtime, post lifecycle, and review eligibility |
| [Blueprint handoff](docs/design/blueprint-handoff.md) | Visual and interaction reference, subject to later scope decisions |
| [Design assets](docs/design/design-assets.md) | Export provenance and which designs count as current |
| [Roadmap and acceptance](docs/implementation/roadmap-and-acceptance.md) | Build order, verification, and the assignment demonstration |

## When documents disagree

The assignment and requirements Professor Enke explicitly approves come first. Newer decisions I've made supersede older proposals. Use the current product spec and decision register for behavior and scope, and the Blueprint handoff for visual details that haven't been superseded.

Some older documents and screenshots still show deferred features. A screen export doesn't make a feature required, implemented, or tested. Design PNGs are present under `docs/design/`, but don't assume they include every canonical artboard or the editable Claude canvas.

This is separate from my PostgreSQL Capstone Ticket System and TicketTinker. Their requirements and architectures don't carry over automatically.
