# Assignment requirements and how I'm scoping the project

> Scope update, November 5, 2026: the [current product spec](../product/product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

## What the lab actually requires

The original NoSQL Database Lab 1 handout says:

> Create a database management system that allows for the storage and manipulation of user entered academic histories and opinions. Assuming that this is being implemented in a social media setting, this lab also requires user filtering and commenting. Your solution should be web hosted and demonstrate a variety of administrative roles.

It also tells me to discuss the database choice and implementation with Professor Enke, get his approval on the system requirements, then demonstrate and discuss the finished work before submitting the files through Blackboard once approved. This is one of the two required database labs, so I want the result to demonstrate MongoDB properly without letting the project become an entire social network.

The handout doesn't require Discord-like navigation, an expressive design system, a rich post editor, or half the other things we've explored. Those are **my project choices**, and I want that distinction to stay clear when deciding what belongs in the first build.

## Connecting the assignment to the app

| The lab asks for | What I'm planning to demonstrate |
| --- | --- |
| Academic histories | Students can add and edit their own self-reported courses, statuses, and terms, with private-by-default visibility |
| Academic opinions | Structured reviews and experience posts attached to actual course records |
| User filtering | Finding people using academic information they're willing to share, without exposing private history |
| Commenting | Replies under questions, discussions, and reviews |
| Web hosting | A real browser-accessible SvelteKit/MongoDB deployment, once the host is decided |
| Different administrative roles | Regular users, space moderators, and platform administrators with server-enforced permissions |
| Database choice and approval | Explain why MongoDB fits, review the requirements with Professor Enke, and record his decision |
| Demonstration and submission | Show data, queries, indexes, aggregate review statistics, permission checks, and working behavior; then submit as instructed |

Professor Enke has also discussed using **WebSockets** for the project, so we're planning realtime posts and replies with Socket.IO. That comes from our conversations about the assignment, though; it's not written in the uploaded Lab 1 handout, so the exact expectation still needs confirmation.

## What's in the first build

The initial app should support accounts using any email address, institution-based discovery, canonical courses, course/community spaces, private academic history, questions, discussions, experiences, structured reviews, and one-level replies. Users need useful filtering and search, reviews need an aggregation that demonstrates MongoDB, and moderators/admins need different permissions with actual server checks. The app should work on phones, offer both Blueprint themes, handle basic loading/error/empty states, and demonstrate realtime post or reply updates in another session.

Markdown and image upload UI are part of the design, but the storage choice and upload limits still need to be settled before those backend features are implemented. I don't want choosing an image service to derail the database lab, so we should decide that explicitly rather than burying it inside an agent-generated implementation.

## Things that can wait

If the core app is working and there's time, a desktop split-pane reader, Focus mode, drafts, command palette, and member previews would be nice. Resizable panes, thread maps, remembered reading positions, elaborate animations, user-created communities, more complete admin tools, typography personalization, and granular notification settings are for later.

I'm **not** planning to build DMs, chat rooms, voice/video, bots, polls, custom Discord-style roles, verified enrollment, SSO, or a full notification center. A design showing one of these ideas doesn't make it part of the assignment.

## What still needs proving

There's a lot of planning and Claude Design work behind this app, but these documents alone don't establish that it's implemented, hosted, accessible, or approved by the professor. We'll need to verify those things in the real application and keep the docs honest about the difference.
