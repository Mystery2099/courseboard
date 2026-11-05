# Academic Discussion Platform — NoSQL Database Lab

**Course:** CISY 8503 — Applied Database Management  
**Assignment:** NoSQL Database Lab 1  
**Current name:** Academic Discussion Platform (I haven't picked a real name yet)  
**Status:** Planning and design are pretty far along; don't assume the app itself is implemented.  
**Last documentation review:** November 5, 2026

For my NoSQL lab, I'm building an academic discussion platform where students can keep track of their own course histories, talk about classes, ask questions, and share more structured reviews of what taking a course was actually like. The navigation takes some inspiration from Discord's spaces and channels, but that's about how people move around the app; I'm not trying to build another chat service. The whole point is that the academic information should still be useful when you aren't actively talking to someone.

This repo's docs are meant to give me, and whichever coding agent I'm working with, enough context to pick up development without revisiting every design conversation. They cover what I've actually decided, what Claude Design came up with, the MongoDB side of the assignment, and the decisions that still need to be made. **A mockup is not a finished feature**, and a proposed technical choice isn't automatically settled just because it's written in a Markdown file.

## Where to start

If you're an agent taking over the project, read [`AGENTS.md`](AGENTS.md) first, then the [decision register](docs/planning/decision-register.md), [assignment and scope](docs/planning/assignment-and-scope.md), [product spec](docs/product/product-spec.md), and [privacy rules](docs/product/privacy-and-permissions.md). After that, use the [Blueprint handoff](docs/design/blueprint-handoff.md) for the actual interface details and the [architecture](docs/technical/architecture.md) and [MongoDB model](docs/technical/mongodb-model.md) for the planned implementation. The [roadmap](docs/implementation/roadmap-and-acceptance.md) breaks that work into smaller pieces.

**Before doing anything else, inspect the actual repo.** This package was written from our planning and design work, not from a verified running NoSQL implementation. If code already exists, compare it with the documentation instead of blindly rebuilding things or assuming these files describe the current state perfectly.

## Documentation map

| File | Why it's here |
| --- | --- |
| `AGENTS.md` | The ground rules for agents working on this project |
| `docs/planning/assignment-and-scope.md` | What the lab actually asks for, versus what I decided to add |
| `docs/planning/decision-register.md` | Choices we've made, things we're still debating, and assumptions agents must not sneak in |
| `docs/planning/needs-assessment.md` | Why I'm building the app, who it's meant for, and what it needs to do |
| `docs/product/product-spec.md` | How spaces, academic histories, posts, reviews, and discovery are supposed to work |
| `docs/product/privacy-and-permissions.md` | What users can see or do, and where we need to be particularly careful |
| `docs/technical/architecture.md` | Planned stack, application boundaries, realtime behavior, hosting considerations |
| `docs/technical/mongodb-model.md` | Candidate collections, indexes, queries, and aggregation work |
| `docs/design/blueprint-handoff.md` | Claude's detailed design reference, with a revised prose layer and preserved technical specs |
| `docs/design/design-assets.md` | Which design exports are current and which still need to be added |
| `docs/implementation/roadmap-and-acceptance.md` | A sensible build order and how we'll know each part works |

## Which document wins if they disagree?

The original assignment, along with any later requirements Professor Enke explicitly approves, comes first. After that, newer decisions I've actually made take priority over old explorations, while the Blueprint handoff should be treated as the reference for visual details unless it labels something optional, undecided, or superseded. The needs assessment explains the reasoning behind the project; it doesn't certify that any particular feature has been built or tested.

The full editable Claude canvas isn't part of this Markdown package. We previously had 62 static PNGs from the *Screens v1* canvas page, but there are additional canonical screens on the *Blueprint · Mobile & Desktop* page. Check [`design-assets.md`](docs/design/design-assets.md) before assuming those exports are complete.

One last distinction: **this is not my PostgreSQL Capstone Ticket System, and it isn't TicketTinker either.** Those are separate projects with different requirements, so don't import their architectures or assumptions into this one just because the names are vaguely related.
