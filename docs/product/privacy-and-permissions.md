# Privacy and permissions

> Scope update, November 5, 2026: the [current product spec](product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

This is one of the parts of the app where I'd rather be overly careful than discover we've accidentally leaked somebody's information. The full Blueprint handoff has the detailed UI rules, but the point of this file is to explain the boundaries that need to hold **in the database queries and server responses**, not just on the screen.

## Three things that must stay separate

**Space membership** means someone follows a course's space. **Academic history** means they personally recorded a relationship to a course, including status, term, and any private information. **Published content** means the posts and replies they've deliberately shared. Those records shouldn't automatically update each other, and membership must never be treated as evidence that a student took the course.

## What people can see

| Information | Default | Who can see it / important detail |
| --- | --- | --- |
| Course, status, and term in a history entry | Private | Other admitted users only when that specific entry is set to **Visible on profile** |
| Private history note | Always private | The owner only; administrators can't read it through the app either |
| Grade | Deferred | Not stored in the first build |
| Review course association | Shown with the published review | Readers see it labeled **self-reported**, with a warning before publishing |
| Following a course | Not shown to other users in the first build | Does **not** imply Taking/Took |
| Posts and replies | Visible to admitted users | Logged-out visitors can't read anything, including images |
| Course stats | Calculated from published, nonremoved reviews | Never from history entries or notes |
| Primary institution | Visible, unless the user hides it | A hidden primary institution doesn't appear in other users' institution filters |
| Other institutions | Shown only with a visible history entry there | Private entries don't reveal past schools |

Don't expose the number of hidden history entries, hint at private courses anywhere, or make self-reported information look verified. Hidden history must stay hidden consistently in people search, profiles, counts, and every other route that could disclose it. A profile with no visible entries shows a neutral empty state that doesn't reveal whether private entries exist.

## Reviews need an especially clear warning

Someone can publish a review only when they've recorded themselves as `Taking` or `Took` for that course; `Planning` doesn't qualify. Their history entry can remain Private, but the review still says they took or are taking the course in a given term, so the UI has to explain that **before they publish**. This was confirmed on November 5, 2026. Neither the app nor its wording should claim that a school verified it.

None of this should stop someone from asking a course question, reading a course space, or following a space. Those actions aren't evidence of attendance.

## Who can do what

| Action | Regular user | Space moderator | Platform admin |
| --- | --- | --- | --- |
| Browse, read, follow courses | Yes | Yes | Yes |
| Ask, discuss, and reply | Yes; no need to follow the course | Yes | Yes |
| Write a review | Requires a Taking/Took entry | Same | Same |
| Edit/delete own posts | Yes, except editing moderator-removed content | Same | Same |
| Report posts and replies | Yes | Yes | Yes |
| Handle reports, remove content, lock discussions | No | Only assigned courses | Across the platform |
| Inspect removed content | No | Only assigned courses | Yes |
| Restore or permanently delete removed content | No | No | Yes |
| Assign moderators, manage invitations | No | No | Yes |
| Manage the course catalog and profanity list | No | No | Yes |
| Suspend users | No | No | Yes |
| Read another user's private history or notes | No | No | No |

Canonical course spaces have no owner, and general communities are deferred. Being a moderator in one course doesn't confer permissions anywhere else.

## How the implementation needs to enforce this

Sessions, admission, and suspension need to be checked on every route, API, image request, and socket connection, and users shouldn't be able to forge the owner, author, moderator role, or visibility of a record through request data. I want **narrow database projections** that return only fields the current user is allowed to read, rather than returning everything and hoping the Svelte component hides the sensitive parts.

That includes search results, snippets, counts, review aggregation, profiles, and WebSocket events. Validate and sanitize Markdown, and check uploads on the server.

## Tests worth having

- Another student can't retrieve my private course or note through a direct ID, profile, search result, or statistic.
- An administrator can't read my private history or notes through any app endpoint.
- Following a course doesn't create a history entry or expose one that already exists.
- A `Planning` entry can't be used to publish a review, and a qualifying entry still gets the **self-reported** label.
- A forged request or socket message can't grant moderation rights; a moderator in one space can't moderate another.
- A logged-out visitor, or a signed-in account without admission, can't load a course page, API response, image, or socket subscription.
- Publishing a review doesn't silently change the privacy of its underlying history record.
- User Markdown or image metadata can't inject scripts into another person's browser.

These are examples of **meaningful behavior to verify**, not a request to write five different versions of the same test.
