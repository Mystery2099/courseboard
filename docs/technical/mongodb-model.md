# MongoDB model and the queries it needs to support

**Candidate design, not a finalized schema.** I want to be able to explain *why* I modeled the data this way when I demonstrate the lab, so the decisions should come from the actual queries and privacy rules rather than copying a relational schema into MongoDB or embedding absolutely everything.

## A few rules before choosing collections

A course belongs to a particular institution, and its code alone isn't necessarily unique across schools. A student's self-reported history entry is different from following the course's discussion space, while a published review is its own piece of content, not simply a history entry made public. Queries and statistics must respect that separation, especially because grades and private notes should never become part of review aggregates.

Embedding can be useful when the data is small, bounded, and really owned by one document. If entries need their own visibility, filtering, independent lifecycle, or frequent updates, a referenced collection may make more sense. I want the final design to justify those tradeoffs, not just say 'MongoDB is document-oriented.'

## Collections we're considering

| Collection | Likely fields | What to watch |
| --- | --- | --- |
| `users` | `_id`, clerkUserId, role, status, username, displayName, primaryInstitutionId, primaryInstitutionHidden, onboardedAt, lastVisitedCourseId | Application profile linked to Clerk; credentials stay in Clerk. Onboarding sets the username, display name, and primary institution together. `primaryInstitutionHidden` is absent until the user hides their school from other users. `lastVisitedCourseId` lets sign-in resume the last course |
| `institutions` | `_id`, name, normalized name, optional identifiers | Used for course identity and discovery |
| `courses` | `_id`, institutionId, code, normalizedCode, title, description, spaceId | Don't identify courses by code alone |
| `spaces` | `_id`, courseId | One canonical space per course, created in the same transaction as the course, which stores its `spaceId`. Routes use the course id, so there's no slug; views are fixed, and general communities are deferred |
| `memberships` | `_id`, userId, spaceId, courseId, followedAt | Following a course; independent of academic history. `courseId` is copied from the space so the followed-course list joins courses directly |
| `academicHistories` | `_id`, userId, courseId, status, term `{ season, year }` (null only while Planning), visibility, privateNote, createdAt, updatedAt | Its own collection, not embedded in `users`; see [below](#why-academic-history-has-its-own-collection). `privateNote` is only ever returned to the owner. Grades are deferred |
| `posts` | `_id`, spaceId, courseId, kind (`question`/`discussion`/`review`), authorId, title, bodyMarkdown, replyCount, acceptedReplyId, lockedAt, createdAt, lastActivityAt, state, reviewData, editedAt; later imageIds | Questions, discussions, and reviews are built. `replyCount` and `acceptedReplyId` live on the post so lists never read replies. Reviews embed status, term, workload, and would-take-again. New posts have state `published`; older posts without a state remain readable. Removal and deletion actions are still planned |
| `replies` | `_id`, postId, parentReplyId, authorId, bodyMarkdown, submissionId, createdAt | Their own collection, because a thread's replies are unbounded and paged. `parentReplyId` is null or a top-level reply of the same post, so nesting stops at one level |
| `reports` | `_id`, reporterId, target, spaceId, reason, state, actions | Must support space-scoped moderation |
| `moderatorAssignments` | `_id`, userId, courseId, spaceId, assignedBy, assignedAt | Built. Its own collection, because the role in `users` is platform-wide while an assignment covers one course. `courseId` is copied from the space so permission checks on a post skip a lookup |
| `images` | `_id`, uploaderId, postId, binary data, MIME type, byte size, dimensions, alt text, state | Binaries stay in their own collection so post queries never load them |

These are starting points; I don't plan on creating all eleven right away. Invitations, profanity terms, and moderation audit records will also need small collections.

## Indexes worth considering

- **Users (built):** unique `clerkUserId` linking the application profile to Clerk, and a unique `username`, stored lowercase. The username index is partial, covering only documents that have one, because accounts that haven't finished onboarding don't. Clerk owns credentials and authentication email.
- **Institutions (built):** unique `normalizedName`.
- **Courses (built):** unique `(institutionId, normalizedCode)`, which also serves browsing one school's courses in code order with a code cursor. Revisit if campuses or cross-listed courses need separate entries.
- **Spaces (built):** unique `courseId`.
- **Memberships (built):** unique `(userId, spaceId)` for following and follow-state checks, plus `(userId, followedAt)` for the followed-course list, which joins courses and institutions with `$lookup`.
- **Histories (built):** unique `(userId, courseId, term)` for an owner's history, another user's visible entries, and review-eligibility checks. Repeated attempts give one user several entries for a course, but only one per term; a null term counts too, so a course is planned without a term only once. Before November 16, 2026 this was a non-unique `(userId, courseId)` index, which let the same course and term be added twice. `(courseId, visibility, status)` and `(visibility, status)` for people filtering; see [search and people filtering](#search-and-people-filtering-built-november-16-2026).
- **Posts (built):** `(spaceId, kind, lastActivityAt, _id)` for a course view ordered by activity; Overview asks for every kind with `$in`, and MongoDB merges the sorted runs. `(spaceId, kind, createdAt, _id)` for Newest and Unanswered, added after `explain()` showed them sorting in memory. The unique partial `(courseId, authorId)` index where `kind = review` enforces one review per user per course, including concurrent submissions. Its course prefix also serves the published-review match for statistics; the local verification used `IXSCAN`.
- **Replies (built):** `(postId, _id)` for a thread's replies in the order they were written. ObjectIds sort by creation time to the second, and within a second only when one server process wrote them, which holds while the app runs as a single instance; the thread page doesn't depend on a nested reply following its parent. Unique `(authorId, submissionId)` so a retried submission is stored once.
- **Moderator assignments (built):** unique `(courseId, userId)`, so a user is assigned to a course once, and the permission check behind locking and `canLock` reads only that index; the local verification used `IXSCAN`. The admin list sorts the whole small collection by `assignedAt` and joins courses, schools, and usernames with `$lookup`.
- **Reports:** `(spaceId, state, createdAt)` for moderation queues.
- **Search:** text indexes on courses (`title`, `code`, `description`) and posts (`title`, `bodyMarkdown`), a `normalizedCode` index for code lookup across schools, and the history indexes above for people filtering. Atlas Search stays deferred.

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

## Search and people filtering (built November 16, 2026)

One search page with four scopes: **Everything**, **Courses**, **Posts**, and **People**. Communities stay deferred. Everything shows the top few of each kind with a link to its full list. Results come from `GET /api/search`, and the page renders the first set on the server. Every list is bounded: 20 results per page and at most five pages, which is plenty for a course catalog and keeps text search cheap without needing cursors over relevance scores.

**Courses.** If the query normalizes to something that looks like a course code (letters followed by digits, such as `cisy 2253` becoming `CISY2253`), match `normalizedCode` by prefix. With a school chosen, that uses the existing `(institutionId, normalizedCode)` index; across all schools it needs a `normalizedCode` index. Otherwise use a text index on `title` (weight 3), `code` (2), and `description` (1), sorted by text score. The school filter defaults to the searcher's primary school, and the empty state offers **Search all schools**, as in the mockup.

**Posts.** A text index on `title` (weight 3) and `bodyMarkdown` (1), leaving out removed and deleted posts, sorted by text score and then `lastActivityAt`. Posts are visible to every admitted user, so the only privacy rule is excluding removed and deleted ones. The snippet is cut on the server from the body's plain text, which `MarkdownRenderer` reads without formatting, link addresses, or code blocks, around the first matched word, at about 160 characters, on word boundaries. Results show the course code, the post kind, and the author, like the mockup.

**People.** This is the lab's user filtering, and the strictest part. Filters: name or username, school, course, and history status. The rules:

- **Only visible history entries are ever queried.** Every pipeline over `academicHistories` starts with `visibility: 'visible'`, so a private entry can't match, count, or appear in a result.
- **Course and status filters** run against `academicHistories` (`courseId`, `visibility: 'visible'`, `status`), group by `userId`, then `$lookup` the users. That needs a `(courseId, visibility, status)` index, which replaces the deferred `(courseId, visibility)` one. A status filter across all schools has no course to start from, so it uses `(visibility, status)`; without it `explain()` showed a collection scan.
- **School filter:** a person matches if their primary school is that school and isn't hidden, *or* they have a visible entry for one of that school's courses. A hidden primary school never matches, as the privacy table requires. A course filter has to belong to the chosen school; one left over from another school is dropped instead of overriding the school.
- **Name filter:** a username prefix, or the start of a word in the display name, case-insensitively. Matching either one can't use an index, so a name-only search scans the accounts. It's acceptable while the other filters and the 20-result limit bound the work, and `explain()` will show whether that stays true.
- **Who appears:** only admitted, active, onboarded accounts. Suspended users and accounts without a profile never appear.
- **What a result shows:** username, display name, initials, the primary school only if it isn't hidden, and only the visible entries that matched the filter (course, status, and term, labeled self-reported). Never a count of entries, never a hint that hidden ones exist, and never a private note.

Each index was checked with `explain()` against the demo data, and the plans are in the [verification log](../implementation/verification-log.md).

## Review aggregation example

A useful lab demonstration would match visible, nonremoved posts where `kind = review` and `courseId` matches the chosen course, then group those reviews to calculate the review count, average workload (1 to 5), and percentage of people who said they'd take it again (yes/no). If a field can ever be missing, exclude it from that average and show the actual denominator rather than pretending everybody answered. **Private history and notes must never be involved.**

**Built:** `ReviewRepository.getStatistics()` matches `courseId`, `kind: review`, and `state: published`, then groups for count, average workload, and the average of 100/0 for would-take-again. Every review requires both ratings. An empty result returns count 0 and null averages. It doesn't join users, so anonymizing an account later won't remove its published reviews from statistics.

## Why academic history has its own collection

My approved proposal to Professor Enke said I'd like to explore **embedded documents for academic histories**. I compared that with a separate `academicHistories` collection and chose the separate collection (November 8, 2026). This is the comparison I'll walk through in the demonstration.

| | Embedded array in `users` | Separate `academicHistories` collection |
| --- | --- | --- |
| Matches the proposal | Yes | No; explain the change |
| Size | Bounded; a student has dozens of entries, not thousands | No limit |
| Owner's history | One document read | One indexed query on `userId` |
| People filtering | `$elemMatch` on visible entries with a multikey index | Query histories, then join or look up users |
| Hiding private entries | `$filter` in an aggregation projection, so private entries and notes never leave MongoDB | Ordinary query filter on `visibility` |
| Editing one entry | Array filters or positional updates | Ordinary single-document updates |
| Risk | A careless `find` on `users` returns private notes | Less risk of returning private data by accident |

Embedding would have kept the proposal's promise and made an owner's history one read. What decided it is that `users` is read on every authenticated request and by admin user lists. With embedded entries, each of those queries would have to project out private notes, and forgetting once would leak them. A separate collection keeps private data out of every query that doesn't ask for it. Entries also behave like independent records: each has its own visibility, a course can have several attempts, reviews check eligibility against them, and account deletion removes them without touching the profile.

The demonstration still shows embedding where it fits: review details embedded in review posts, and a user's institutions on their profile. Both are small and owned by one document.

## Edge cases we shouldn't ignore

A student might take the same course twice or change a status from Planning to Taking to Took. Two institutions can have identically named courses; there may also be cross-listed classes. The [product spec](../product/product-spec.md) now settles deleted accounts, removed posts, and review snapshots when a history entry changes. We still need to decide how abandoned uploads get cleaned up. Losing moderator permission takes effect on the next request, since every lock checks the assignment; an open page keeps showing the button until it reloads.

## What I want to show Professor Enke

I want to be able to open real example documents, explain the boundaries between them, run indexed queries and at least one useful aggregation, and show why embedding or referencing made sense. I'd also like to demonstrate an actual post/reply update after a database write, plus a query or projection that proves private history isn't exposed. If the deployment uses transactions or change streams, I'll need to explain the topology and why those features are available, not simply claim MongoDB handles everything automatically.
