# MongoDB model and the queries it needs to support

> Scope update, November 5, 2026: the [current product spec](../product/product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

**Candidate design, not a finalized schema.** I want to be able to explain *why* I modeled the data this way when I demonstrate the lab, so the decisions should come from the actual queries and privacy rules rather than copying a relational schema into MongoDB or embedding absolutely everything.

## A few rules before choosing collections

A course belongs to a particular institution, and its code alone isn't necessarily unique across schools. A student's self-reported history entry is different from following the course's discussion space, while a published review is its own piece of content, not simply a history entry made public. Queries and statistics must respect that separation, especially because grades and private notes should never become part of review aggregates.

Embedding can be useful when the data is small, bounded, and really owned by one document. If entries need their own visibility, filtering, independent lifecycle, or frequent updates, a referenced collection may make more sense. I want the final design to justify those tradeoffs, not just say 'MongoDB is document-oriented.'

## Collections we're considering

| Collection | Likely fields | What to watch |
| --- | --- | --- |
| `users` | `_id`, clerkUserId, display name, username, primaryInstitutionId, institutions, settings | Application profile linked to Clerk; credentials stay in Clerk |
| `institutions` | `_id`, name, normalized name, optional identifiers | Used for course identity and discovery |
| `courses` | `_id`, institutionId, code, normalizedCode, title, metadata | Don't identify courses by code alone |
| `spaces` | `_id`, `kind` (`course`/`community`), optional courseId, slug, name, channel configuration | Course spaces should be canonical where applicable |
| `memberships` | `_id`, userId, spaceId, joinedAt, optional pin state | Independent of academic history |
| `academicHistories` | `_id`, userId, courseId, status, term, visibility, optional grade/privateNote | Separate collection is a candidate because entries have individual privacy |
| `posts` | `_id`, spaceId, optional courseId, channelId, kind, authorId, title, bodyMarkdown, optional reviewData, timestamps | Review structure belongs with review posts |
| `replies` | `_id`, postId, optional parentReplyId, authorId, bodyMarkdown, timestamps | One-level nesting at most |
| `reports` | `_id`, reporterId, target, spaceId, reason, state, actions | Must support space-scoped moderation |
| `moderatorAssignments` | `_id`, spaceId, userId, assignedBy | Separate global admins from space moderators |
| `media` | `_id`, authorId, storage reference, MIME type, size, alt text, state | Only after image storage is chosen |

These are starting points, not instructions to create eleven collections immediately. We still need to decide whether histories or replies should be embedded, how community channels are represented, and whether moderator assignments deserve a separate collection.

## Indexes worth considering

- **Users:** unique `clerkUserId` linking the application profile to Clerk, plus a unique normalized username if owned by the application. Clerk owns credentials and authentication email.
- **Institutions:** a normalized unique name or official identifier, depending on the catalog source.
- **Courses:** perhaps unique `(institutionId, normalizedCode)`, but only after checking how the catalog handles repeats, campuses, and cross-listed courses.
- **Spaces:** uniqueness for canonical course spaces and appropriately scoped slugs.
- **Memberships:** unique `(userId, spaceId)` and an index for listing members of a space.
- **Histories:** `(userId, term)` for an owner's history, with a visibility-aware index only if public filtering actually needs it; repeated attempts complicate uniqueness.
- **Posts:** indexes supporting `(spaceId, channelId, createdAt)` and course review queries such as `(courseId, kind, createdAt)`.
- **Replies:** `(postId, createdAt)` plus parent lookup if needed.
- **Reports:** `(spaceId, state, createdAt)` for moderation queues.
- **Search:** use MongoDB text indexes for initial full-text search, plus ordinary indexes for course codes and structured filters. Defer Atlas Search.

I don't want every imaginable index created 'just in case.' Seed believable fictional data, look at the actual query shapes and plans, and add indexes that solve real problems.

## Queries the app will actually make

1. **Home:** fetch recent posts from the spaces someone follows, with stable pagination.
2. **Course overview:** show recent activity across the course's four fixed channels.
3. **My history:** show all of my entries, including private fields and visibility controls.
4. **Someone else's history:** return only Visible entries and permitted fields, with clear self-reported labels.
5. **People search:** filter using visible history, never privately recorded courses or hidden-entry counts.
6. **Review eligibility:** check whether the author has a qualifying Taking/Took entry, regardless of membership.
7. **Course statistics:** aggregate published reviews, not grades or history records.
8. **Moderation:** show a moderator only reports for spaces they're permitted to manage.
9. **Search:** filter posts, courses, and spaces by context without including private information in matches or snippets.

## Review aggregation example

A useful lab demonstration would match visible, nonremoved posts where `kind = review` and `courseId` matches the chosen course, then group those reviews to calculate the review count, average workload, and percentage of people who said they'd retake it. Missing answers need a clear rule: for example, exclude absent workload ratings from that average and show the actual denominator rather than pretending everybody answered. **Private grades must never be involved.** The exact review field scales still need to be finalized.

## Edge cases we shouldn't ignore

A student might take the same course twice or change a status from Planning to Taking to Took. Two institutions can have identically named courses; there may also be cross-listed classes. We need to decide how deleted accounts and removed posts affect replies, whether deleting a history entry affects an existing review, how abandoned uploads get cleaned up, and what happens if someone loses moderator permission while they still have a page or socket open.

## What I want to show Professor Enke

I want to be able to open real example documents, explain the boundaries between them, run indexed queries and at least one useful aggregation, and show why embedding or referencing made sense. I'd also like to demonstrate an actual post/reply update after a database write, plus a query or projection that proves private history isn't exposed. If the deployment uses transactions or change streams, I'll need to explain the topology and why those features are available, not simply claim MongoDB handles everything automatically.
