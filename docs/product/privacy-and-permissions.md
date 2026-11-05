# Privacy and permissions

> Scope update, November 5, 2026: the [current product spec](product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

This is one of the parts of the app where I'd rather be overly careful than discover we've accidentally leaked somebody's information. The full Blueprint handoff has the detailed UI rules, but the point of this file is to explain the boundaries that need to hold **in the database queries and server responses**, not just on the screen.

## Three things that must stay separate

**Space membership** means someone follows or has joined a space. **Academic history** means they personally recorded a relationship to a course, including status, term, and any private information. **Published content** means the posts and replies they've deliberately shared. Those records shouldn't automatically update each other, and membership must never be treated as evidence that a student took the course.

## What people can see

| Information | Default | Who can see it / important detail |
| --- | --- | --- |
| Course, status, and term in a history entry | Private | Other signed-in users only when that specific entry is set to **Visible on profile** |
| Grade | Always private | The owner, never other profiles, statistics, or search |
| Private history note | Always private | The owner only |
| Review/experience course association | Shown with the published post | Readers see it labeled **self-reported**, with advance disclosure before posting |
| Space membership | Visible to signed-in users in current design | Does **not** imply Taking/Took |
| Online presence | On by default in the handoff | Can be hidden from 'Here now' and presence dots without leaving the directory |
| Posts and replies | Visible to signed-in users in current design | Logged-out visibility is still undecided |
| Course stats | Calculated from reviews | Never from hidden history entries or grades |
| Primary institution | Visible under current design | Past-school profile visibility still needs a decision |

Don't expose the number of hidden history entries, sneak private courses into member badges, or make self-reported information look verified. If someone hides their academic history, that needs to apply consistently to people search, member previews, counts, and every other route that could disclose it.

## Reviews need an especially clear warning

The current design lets someone publish a review or experience when they've recorded themselves as `Taking` or `Took` for that course; `Planning` doesn't qualify. Their history entry can remain Private, but the public post would still say they took or are taking the course, so the UI has to explain that distinction **before they publish**. We're treating this as the current design direction while keeping final confirmation open; neither the app nor its wording should claim that a school verified it.

None of this should stop someone from asking a course question, reading a course space, or following a space. Those actions aren't evidence of attendance.

## Who can do what

| Action | Regular user | Space moderator | Platform admin |
| --- | --- | --- | --- |
| Browse, read, join/follow | Yes | Yes | Yes |
| Ask, discuss, and reply | Yes; course spaces don't require joining | Yes | Yes |
| Write a review or experience | Requires eligible history entry | Same | Same |
| Edit/delete own posts | Yes | Yes | Yes |
| Report content | Yes | Yes | Yes |
| Pin/remove posts, dismiss reports | No | Only assigned spaces | Across the platform |
| Assign moderators | No | No | Yes |
| Manage the course catalog | No | No | Yes |
| Suspend users | No | No | Yes; fuller UI can wait |
| Create communities | No | No | Admin-managed in v1 |

Community owners belong to a later phase, and canonical course spaces have no owner. Being a moderator in one space shouldn't confer permissions anywhere else.

## How the implementation needs to enforce this

Sessions need to be checked on private routes and socket connections, and users shouldn't be able to forge the owner, author, moderator role, or visibility of a record through request data. I want **narrow database projections** that return only fields the current user is allowed to read, rather than returning everything and hoping the Svelte component hides the sensitive parts.

That includes search documents, autocomplete, snippets, counts, review aggregation, member cards, and WebSocket events. Validate and sanitize Markdown, check uploads on the server, and make sure presence events don't leak information somebody has opted out of showing.

## Tests worth having

- Another student can't retrieve my private course, grade, or note through a direct ID, profile, search result, member preview, or statistic.
- Joining a course space doesn't create a history entry or expose one that already exists.
- A `Planning` entry can't be used to publish a review, and a qualifying entry still gets the **self-reported** label.
- A forged request or socket message can't grant moderation rights; a moderator in one space can't moderate another.
- Turning presence off removes someone from 'Here now' without quietly changing the membership policy.
- Publishing a review doesn't silently change the privacy of its underlying history record.
- User Markdown or image metadata can't inject scripts into another person's browser.

These are examples of **meaningful behavior to verify**, not a request to write five different versions of the same test.
