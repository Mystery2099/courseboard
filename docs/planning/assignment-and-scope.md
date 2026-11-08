# Assignment requirements

## What the lab actually requires

The [NoSQL Database Lab 1 handout](../course/NoSQL%20Database%20Lab%201.md) says:

> In this lab, you are being asked to create a database management system that allows for the storage and manipulation of user entered academic histories and opinions. Assuming that this is being implemented in a social media setting, this lab also requires user filtering and commenting. Your solution should be web hosted and demonstrate a variety of administrative roles.

It also tells me to discuss the database choice and implementation with Professor Enke, get his approval on the system requirements, then demonstrate and discuss the finished work before submitting all the files I've created through Blackboard once approved. This is one of the two required database labs, so I want the result to demonstrate MongoDB properly without letting the project become an entire social network.

The handout doesn't require Discord-like navigation, an expressive design system, a rich post editor, or half the other things we've explored. Those are **my project choices**, and I want that distinction to stay clear when deciding what belongs in the first build. The [product spec](../product/product-spec.md) has the current scope.

## What every lab needs

Professor Enke's [lab checklist](../course/lab-checklist.md) applies to all labs: his approval, a needs assessment (with revisions as the project evolves), self-evaluations that record my response to each peer evaluation, working functionality that meets the client's demands, secure coding, an appropriate interface, deployment readiness, and a demonstration before submission. The [self-review questions](../course/lab-self-review-questions.md) cover goals, audience, accessibility, UI/UX, and security. The [syllabus](../course/CISY%208503%20Fall%2025%20syllabus.docx) also lists a security and data recovery plan as a course objective and requires a cover page on every submission. The [roadmap](../implementation/roadmap-and-acceptance.md) tracks each of these.

## Connecting the assignment to the app

| The lab asks for | What I'm planning to demonstrate |
| --- | --- |
| Academic histories | Students can add and edit their own self-reported courses, statuses, and terms, with private-by-default visibility |
| Academic opinions | Structured reviews, questions, and discussions attached to actual course records |
| User filtering | Finding people using academic information they're willing to share, without exposing private history |
| Commenting | Replies under questions, discussions, and reviews |
| Web hosting | A real browser-accessible deployment: SvelteKit on Render Free, MongoDB on Atlas Free |
| Different administrative roles | Regular users, course moderators, and platform administrators with server-enforced permissions |
| Database choice and approval | Approved November 4, 2026; explain why MongoDB fits during the demonstration |
| Demonstration and submission | Show data, queries, indexes, aggregate review statistics, permission checks, and working behavior; then submit as instructed |

## Professor approval

I emailed Professor Enke a proposal on November 3, 2026: a web-based academic discussion platform loosely inspired by Discord, with academic profiles and histories, course posts, comments, profile and experience filtering, moderators and administrators, MongoDB with SvelteKit and TypeScript, embedded academic histories, and filtering, indexing, and aggregation queries.

He replied on November 4: "Your lab sounds good!" We'd already discussed it in person. He said the proposal was good, that he **expects WebSockets**, and that **Markdown support is a given**. Neither is written in the handout, but both are requirements for this project.

The scope has narrowed since the proposal: general communities and Experience posts are deferred, and academic history may not end up embedded (D16 in the [decision register](decision-register.md)). I'll point out those changes during the demonstration rather than presenting the original proposal as what was built.
