# MongoDB model and the queries it needs to support

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
| `spaces` | `_id`, courseId, slug, name | One canonical space per course, created with the course; views are fixed, and general communities are deferred |
| `memberships` | `_id`, userId, spaceId, joinedAt | Following a course; independent of academic history |
| `academicHistories` | `_id`, userId, courseId, status, term, visibility, privateNote | Separate collection or embedded in `users`; see D16 below. Grades are deferred |
| `posts` | `_id`, spaceId, courseId, kind (`question`/`discussion`/`review`), authorId, title, bodyMarkdown, optional reviewData, imageIds, state, timestamps | Review structure belongs with review posts; one review per user per course |
| `replies` | `_id`, postId, optional parentReplyId, authorId, bodyMarkdown, timestamps | One-level nesting at most |
| `reports` | `_id`, reporterId, target, spaceId, reason, state, actions | Must support space-scoped moderation |
| `moderatorAssignments` | `_id`, spaceId, userId, assignedBy | Separate global admins from space moderators |
| `images` | `_id`, uploaderId, postId, binary data, MIME type, byte size, dimensions, alt text, state | Binaries stay in their own collection so post queries never load them |

These are starting points; I don't plan on creating all eleven right away. We still need to decide whether histories should be embedded (D16) and whether moderator assignments deserve a separate collection. Invitations, profanity terms, and moderation audit records will also need small collections.

## Indexes worth considering

- **Users:** unique `clerkUserId` linking the application profile to Clerk, plus a unique normalized username if owned by the application. Clerk owns credentials and authentication email.
- **Institutions:** a normalized unique name or official identifier, depending on the catalog source.
- **Courses:** perhaps unique `(institutionId, normalizedCode)`, but only after checking how the catalog handles repeats, campuses, and cross-listed courses.
- **Spaces:** uniqueness for canonical course spaces and appropriately scoped slugs.
- **Memberships:** unique `(userId, spaceId)`.
- **Histories:** `(userId, term)` for an owner's history, with a visibility-aware index only if public filtering actually needs it; repeated attempts complicate uniqueness.
- **Posts:** indexes supporting `(spaceId, kind, lastActivityAt)` and course review queries such as `(courseId, kind, createdAt)`. A unique partial index on `(courseId, authorId)` where `kind = review` enforces one review per user per course.
- **Replies:** `(postId, createdAt)` plus parent lookup if needed.
- **Reports:** `(spaceId, state, createdAt)` for moderation queues.
- **Search:** use MongoDB text indexes for initial full-text search, plus ordinary indexes for course codes and structured filters. Defer Atlas Search.

I don't want every imaginable index created 'just in case.' Seed believable fictional data, look at the actual query shapes and plans, and add indexes that solve real problems.

## Queries the app will actually make

1. **Course overview:** show recent activity across the course's Questions, Reviews, and Discussion views, with stable pagination. (The Home feed across followed courses is deferred.)
2. **Course view:** list one kind of post for a course, newest activity first, with an Unanswered filter for questions.
3. **My history:** show all of my entries, including private fields and visibility controls.
4. **Someone else's history:** return only Visible entries and permitted fields, with clear self-reported labels.
5. **People search:** filter using visible history, never privately recorded courses or hidden-entry counts.
6. **Review eligibility:** check whether the author has a qualifying Taking/Took entry, regardless of membership.
7. **Course statistics:** aggregate published reviews, not grades or history records.
8. **Moderation:** show a moderator only reports for spaces they're permitted to manage.
9. **Search:** filter posts and courses by context without including private information in matches or snippets.

## Review aggregation example

A useful lab demonstration would match visible, nonremoved posts where `kind = review` and `courseId` matches the chosen course, then group those reviews to calculate the review count, average workload (1 to 5), and percentage of people who said they'd take it again (yes/no). If a field can ever be missing, exclude it from that average and show the actual denominator rather than pretending everybody answered. **Private history and notes must never be involved.**

## Embedding academic history

My approved proposal to Professor Enke said I'd like to explore **embedded documents for academic histories**. The current model leans toward a separate `academicHistories` collection. This is decision D16, and I need to be able to explain whichever one I choose.

| | Embedded array in `users` | Separate `academicHistories` collection |
| --- | --- | --- |
| Matches the proposal | Yes | No; explain the change |
| Size | Bounded; a student has dozens of entries, not thousands | No limit |
| Owner's history | One document read | One indexed query on `userId` |
| People filtering | `$elemMatch` on visible entries with a multikey index | Query histories, then join or look up users |
| Hiding private entries | `$filter` in an aggregation projection, so private entries and notes never leave MongoDB | Ordinary query filter on `visibility` |
| Editing one entry | Array filters or positional updates | Ordinary single-document updates |
| Risk | A careless `find` on `users` returns private notes | Less risk of returning private data by accident |

Embedding demonstrates a more document-oriented design and keeps the proposal's promise. The risk is manageable if every read of another user's profile goes through one projection or pipeline that strips private entries and notes. Decide this before Stage 1, and record the choice and reasoning in the decision register.

## Edge cases we shouldn't ignore

A student might take the same course twice or change a status from Planning to Taking to Took. Two institutions can have identically named courses; there may also be cross-listed classes. The [product spec](../product/product-spec.md) now settles deleted accounts, removed posts, and review snapshots when a history entry changes. We still need to decide how abandoned uploads get cleaned up and what happens if someone loses moderator permission while they still have a page or socket open.

## What I want to show Professor Enke

I want to be able to open real example documents, explain the boundaries between them, run indexed queries and at least one useful aggregation, and show why embedding or referencing made sense. I'd also like to demonstrate an actual post/reply update after a database write, plus a query or projection that proves private history isn't exposed. If the deployment uses transactions or change streams, I'll need to explain the topology and why those features are available, not simply claim MongoDB handles everything automatically.
