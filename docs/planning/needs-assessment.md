# Needs Assessment: Academic Discussion Platform

**Course:** CISY 8503 Applied Database Management  
**Lab:** NoSQL Database Lab 1  
**Status:** Second version, November 8, 2026; before most of the implementation  
**Previous version:** [November 4, 2026](needs-assessment-original.md)

## Introduction

For my NoSQL Database Lab, I'm building a web-based platform where students can ask about courses, discuss them, review them, and keep a record of their own academic history. Professor Enke approved the proposal on November 4, 2026. Since then, I've narrowed the scope quite a bit, so this version replaces the first one rather than patching it. The [first version](needs-assessment-original.md) is still there if anyone wants to see how the plan evolved.

I'm still using the six-step framework from my class notes. The difference is that this time I want to start from the actual problem instead of from the designs, because the designs are what made the first version drift toward a bigger project than the lab needs.

## What changed since the first version

- **Courses only.** General communities and Experience posts are deferred. Every course gets one space with Overview, Questions, Reviews, and Discussion.
- **Invitation-only access.** Logged-out visitors can't read anything, including images. Accounts need an individual invitation tied to a verified email.
- **Smaller first build.** Grades, the Home feed, online presence, Focus mode, split-pane reading, and the command palette are deferred.
- **Settled technical choices.** Images go in their own MongoDB collection, search uses MongoDB text indexes, and hosting is Render Free with Atlas Free.
- **Requirements from the professor.** He expects WebSockets and treats Markdown support as a given, so both are requirements rather than extras.

The [decision register](decision-register.md) has the reasoning behind each of these.

## 1. Objectives and Scope

**The problem:** when students try to figure out what a course is actually like, the useful information is scattered across group chats, word of mouth, and general rating sites. It isn't tied to the specific course at their school, it gets lost once a conversation moves on, and there's usually no way to tell when someone took the course or whether they took it at all. At the same time, a student's own course history lives in a separate place entirely, if they keep track of it at all.

The repeated questions in group chats and the vague "it was fine" reviews are symptoms of that problem. Building a better chat wouldn't fix them. What helps is giving each course a lasting place for questions, discussions, and structured reviews, and letting students record their own history privately, sharing only what they choose.

The lab handout asks for storage and manipulation of user-entered academic histories and opinions, user filtering, commenting, web hosting, and a variety of administrative roles. The objective is an application where MongoDB does meaningful work for each of those: storing histories and reviews, filtering people without exposing private records, indexing real queries, and aggregating review statistics.

A successful demonstration shows someone signing in, recording course history, finding a course, asking a question, replying, and seeing a new post or reply appear in another session without refreshing. It also shows review statistics from an aggregation pipeline, and moderators and administrators doing things regular users can't.

## 2. Stakeholders and User Needs

The primary users are students: current students, transfer students, former students, and people researching courses they might take. They need to find a course quickly, read what others have said, ask a question even if they haven't taken it, and keep their own history without it being public by default.

**Most of them will be on their phones**, so the app has to work well at 360px wide rather than feeling like a shrunken desktop site.

**Privacy matters more than it might seem.** A course history can reveal a lot about someone, so entries start private and only appear on a profile when the student chooses. Following a course is never treated as evidence of taking it. Writing a review does reveal that someone took the course, so the app warns them before they publish.

Moderators need a manageable queue for their assigned courses. Administrators need to manage the course catalog, invitations, and roles, but they shouldn't be able to read anyone's private history. Professor Enke is effectively the client: he needs to see that the data model, queries, permissions, and realtime behavior meet the lab requirements.

These needs come from my own experience and our design work, not formal research. I'll check the main workflows with a few students before calling the interface validated.

## 3. Existing Workflows and Technology

There isn't an existing system being replaced, so a traditional process audit doesn't apply. Students currently rely on informal conversations and general-purpose sites that aren't connected to their institution's courses or to their own records.

The new workflow starts with an invitation and onboarding, where the student picks a username, display name, and primary institution. From there they can browse courses, follow the ones they want in their navigation, and record courses they're planning, taking, or took. Each of those is a separate action, and none of them silently changes the others. Inside a course, they can ask questions, start discussions, reply, and, with a Taking or Took entry, write one review.

The stack is SvelteKit with Svelte 5 and TypeScript, MongoDB through the official Node.js driver, Clerk for authentication, Socket.IO for realtime updates, and Zod for validation. Everything runs as one application with a clear client/server boundary and an HTTP API, described in the [architecture](../technical/architecture.md).

## 4. Functional and Technical Requirements

The lab requirements come first, then the things that make the app usable. Anything else waits.

| Priority | Requirement | Reason or expected behavior |
| --- | --- | --- |
| Lab | Self-reported academic histories | Planning/Taking/Took entries with terms, repeated attempts, private notes, and per-entry visibility |
| Lab | Academic opinions | Questions, discussions, and structured reviews tied to real course records |
| Lab | User filtering | Find people by institution, course, and status using only visible history |
| Lab | Commenting | One-level replies, with accepted answers on questions |
| Lab | Web hosting | Render Free and Atlas Free, strictly free |
| Lab | Administrative roles | Regular users, course moderators, and platform administrators, enforced on the server |
| Professor | WebSockets | New posts and replies appear in other sessions after they're saved |
| Professor | Markdown | Safe Markdown rendering in posts and replies |
| Usable | Search, images, and moderation tools | Course and post search, two images per post, reports, locking, and a profanity filter |
| Usable | Responsive and accessible UI | Blueprint light/dark themes, WCAG 2.1 AA, working layouts at 360px |
| Deferred | Communities, Home feed, presence, Focus, split panes, command palette, grades, MFA | Useful later, but not needed to demonstrate the database |
| Out of scope | DMs, voice/video, bots, verified enrollment | Far beyond what the lab is asking for |

**Data model.** Institutions, courses, course spaces, follows, academic histories, posts, replies, reports, moderator assignments, and images. The one open question is whether histories are embedded in user documents, as my proposal said, or kept in their own collection. The [MongoDB model](../technical/mongodb-model.md) compares both, and I'll decide before building that part.

**Security.** Every page, API, image, and socket subscription checks the session, admission, and permissions on the server. The [security and recovery plan](../technical/security-and-recovery.md) covers the rest.

The [product spec](../product/product-spec.md) has the detailed behavior.

## 5. Gap Analysis, Risks, and Budget

The main gap is between a pile of posts and a system that actually connects courses, people, and academic records. If posts aren't linked to structured courses, filtering and aggregation lose most of their value. If history and following are coupled, students either end up following dozens of old courses or reveal more than they meant to.

**Scope is still the biggest risk.** We designed a lot more than the lab needs, and the first version of this assessment showed it. Narrowing to courses and deferring the extras should leave enough time to finish the parts that matter properly.

**Privacy mistakes are the second biggest.** Hidden history could leak through search results, counts, or a careless database query. The plan is to return only the fields each user is allowed to see from MongoDB itself, then test with separate accounts.

Realtime adds some complexity, but saving through HTTP first and treating socket events as notices keeps MongoDB as the source of truth.

The budget is zero: no payment method and no overage billing. Render's cold starts are an accepted tradeoff, and Atlas Free limits the image quota to 100 MB. The real costs are my time for setup, deployment troubleshooting, backups, and keeping the site running for about a month after grading.

## 6. Action Plan and Roadmap

The [roadmap](../implementation/roadmap-and-acceptance.md) has the detailed checklist, but the order is:

1. **Prove the infrastructure.** Clerk, invitations, Socket.IO, Atlas, and one protected image upload working on the deployed host. Invitations already work locally.
2. **Finish one course workflow.** Onboarding, history, course discovery, questions, discussions, and replies.
3. **Reviews and discovery.** Reviews, the statistics aggregation, search, people filtering, and indexes based on actual query plans.
4. **Content safety and realtime.** Markdown, images, moderation, the profanity filter, and live updates.
5. **Polish, review, and demonstrate.** Test at phone and desktop sizes, run usability checks with a few students, complete the self-review, and demonstrate to Professor Enke before submitting.

## Conclusion

Starting from the problem made it easier to see what the first build actually needs: lasting course discussions, structured reviews, and private academic histories, with MongoDB doing real work for each. The deferred features are still in the designs if there's time later, but the lab doesn't depend on them.

---

### Planning references

- My course notes, *Software Needs Assessment*.
- Professor Enke's [NoSQL Database Lab 1 handout](../course/NoSQL%20Database%20Lab%201.md) and [lab checklist](../course/lab-checklist.md).
- Claude Design, *Blueprint Design Handoff* (November 3, 2026). These are design artifacts, not findings from a user study.
