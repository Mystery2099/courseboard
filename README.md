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

| Part | Choice | Why I'm using it |
| --- | --- | --- |
| Application | SvelteKit, Svelte, TypeScript | The web app and its server-side routes |
| Package manager | pnpm | My preferred package manager |
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

I still need to check exact versions, the production runtime, and how everything behaves once deployed. Clerk's Svelte integration is community-maintained, and production MFA requires a paid plan, so MFA is deferred. Google login is still undecided.

## Client/server architecture

Everything lives in one repository and deploys as one application, but with a clear line between client and server. Core reads and writes go through an HTTP API backed by application services and repositories. The server owns business rules, permissions, validation, and database access; the client only handles presentation and interaction. Web pages reuse the same services, and server-rendered pages call them directly instead of making HTTP requests to their own API.

That way a mobile or desktop client could use the same API later, although only the web client is part of the assignment. I don't need a separate backend framework, microservices, or multiple packages for this. Invitations are the first feature built this way. See the [architecture](docs/technical/architecture.md).

## Priorities

I care about low memory usage, fast transitions and loading, and perceived responsiveness. Privacy has to hold on the server, not just in the UI: a Clerk account alone doesn't grant access, and even administrators can't read another student's private history through the app. Everything must stay free, without a payment method or overage billing, and Render's cold starts are an accepted tradeoff. The design stays **Blueprint**, including its light/dark themes and typography.

## Where to start

Read the [product spec](docs/product/product-spec.md) and [decision register](docs/planning/decision-register.md) first. The spec describes how the app should behave, and the register records why. The [roadmap](docs/implementation/roadmap-and-acceptance.md) turns those decisions into build stages and acceptance checks.

The repository contains planning documents, assignment materials, design exports, and an application scaffold. The app isn't a working product yet: it sets up configuration, the MongoDB connection, Clerk, and Socket.IO, and invitations are the only feature so far.

To run it locally, copy `.env.example` to `.env`, fill in Clerk and MongoDB values, then run `pnpm install` and `pnpm dev`. For production, use `pnpm build` and `pnpm start`; `render.yaml` describes the Render service. GitHub Actions runs linting, type checks, server tests, and the build on every pull request and push to `master`; Render deploys `master` only after those checks pass. `GET /api/health` reports whether MongoDB is reachable. The first implementation step is to prove the hosted combination of Clerk, SvelteKit, Socket.IO, Atlas, and one protected image upload before building dependent screens.

| Document | What it's for |
| --- | --- |
| [Course materials](docs/course/) | Professor Enke's handout, syllabus, lab checklist, and self-review questions, kept as provided |
| [Assignment requirements](docs/planning/assignment-and-scope.md) | The lab handout, how the app covers it, and Professor Enke's approval |
| [Decision register](docs/planning/decision-register.md) | What we decided, why, what we turned down, and open questions |
| [Needs assessment](docs/planning/needs-assessment.md) | The reasoning behind the original project plan; parts are out of date |
| [Product spec](docs/product/product-spec.md) | Current behavior, privacy and permissions, moderation, and first-release scope |
| [Architecture](docs/technical/architecture.md) | Client/server structure, the HTTP API, caching, and realtime behavior |
| [MongoDB model](docs/technical/mongodb-model.md) | Candidate documents, indexes, queries, and aggregation work |
| [Diagrams](docs/technical/diagrams.md) | System context, collections, request checks, admission, realtime, post lifecycle, and review eligibility |
| [Blueprint handoff](docs/design/blueprint-handoff.md) | Design tokens, components, layout, interactions, and which artboards are current |
| [Roadmap and acceptance](docs/implementation/roadmap-and-acceptance.md) | Build order, verification, and the assignment demonstration |

## When documents disagree

The assignment and requirements Professor Enke explicitly approves come first. Newer decisions I've made supersede older proposals. Use the product spec and decision register for behavior and scope, and the Blueprint handoff for visual details that haven't been superseded. The needs assessment and some screenshots still show deferred features; a screen export doesn't make a feature required, implemented, or tested.

This is separate from my PostgreSQL Capstone Ticket System and TicketTinker. Their requirements and architectures don't carry over automatically.
