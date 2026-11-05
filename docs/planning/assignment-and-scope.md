# Assignment requirements and how I'm scoping the project

> Scope update, November 5, 2026: the [current product spec](../product/product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

## What the lab actually requires

The original NoSQL Database Lab 1 handout says:

> Create a database management system that allows for the storage and manipulation of user entered academic histories and opinions. Assuming that this is being implemented in a social media setting, this lab also requires user filtering and commenting. Your solution should be web hosted and demonstrate a variety of administrative roles.

It also tells me to discuss the database choice and implementation with Professor Enke, get his approval on the system requirements, then demonstrate and discuss the finished work before submitting the files through Blackboard once approved. He approved my proposal on November 4, 2026; see [Professor approval](#professor-approval). This is one of the two required database labs, so I want the result to demonstrate MongoDB properly without letting the project become an entire social network.

The handout doesn't require Discord-like navigation, an expressive design system, a rich post editor, or half the other things we've explored. Those are **my project choices**, and I want that distinction to stay clear when deciding what belongs in the first build.

## Connecting the assignment to the app

| The lab asks for | What I'm planning to demonstrate |
| --- | --- |
| Academic histories | Students can add and edit their own self-reported courses, statuses, and terms, with private-by-default visibility |
| Academic opinions | Structured reviews, questions, and discussions attached to actual course records |
| User filtering | Finding people using academic information they're willing to share, without exposing private history |
| Commenting | Replies under questions, discussions, and reviews |
| Web hosting | A real browser-accessible deployment: SvelteKit on Render Free, MongoDB on Atlas Free |
| Different administrative roles | Regular users, space moderators, and platform administrators with server-enforced permissions |
| Database choice and approval | Approved November 4, 2026; explain why MongoDB fits during the demonstration |
| Demonstration and submission | Show data, queries, indexes, aggregate review statistics, permission checks, and working behavior; then submit as instructed |

## Professor approval

I emailed Professor Enke a proposal on November 3, 2026, and he replied on November 4: "Your lab sounds good!" We'd already discussed it in person. He said the proposal was good, that he **expects WebSockets**, and that **Markdown support is a given**. Neither requirement is written in the handout, but both are requirements for this project.

The proposal described communities and channels, experience posts, and embedded academic histories. The current scope defers communities and Experience posts, and the history model is still being decided (D16 in the [decision register](decision-register.md)). I'll point out those changes during the demonstration.

## What's in the first build

The initial app supports invitation-based accounts using any email address, institution-based discovery, canonical course spaces, private academic history, questions, discussions, structured reviews, and one-level replies. Users need useful filtering and search, reviews need an aggregation that demonstrates MongoDB, and moderators/admins need different permissions with actual server checks. The app should work on phones, offer both Blueprint themes, handle basic loading/error/empty states, and demonstrate realtime post or reply updates in another session.

Posts and replies support safe Markdown. Top-level posts can carry up to two small images, stored in a separate MongoDB collection. The [product spec](../product/product-spec.md) has the full details.

## Things that can wait

General communities, Experience posts, grades, the Home feed, online presence, a desktop split-pane reader, Focus mode, the command palette, and member previews are deferred. Resizable panes, thread maps, elaborate animations, user-created communities, typography personalization, and notification settings are for later.

I'm **not** planning to build DMs, chat rooms, voice/video, bots, polls, custom Discord-style roles, verified enrollment, SSO, or a full notification center. A design showing one of these ideas doesn't make it part of the assignment.

## What still needs proving

There's a lot of planning and Claude Design work behind this app, but these documents alone don't establish that it's implemented, hosted, or accessible. We'll need to verify those things in the real application and keep the docs honest about the difference.
