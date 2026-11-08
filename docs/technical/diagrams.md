# Diagrams

**Status:** Drawn from the planning docs, November 5, 2026. These diagrams show the plan, not a verified implementation. If a diagram disagrees with the [product spec](../product/product-spec.md) or the [decision register](../planning/decision-register.md), those documents win, and the diagram needs fixing.

## System context

What runs where, and which service owns what. Clerk owns identity, MongoDB owns everything the application decides, and the browser never talks to MongoDB directly.

Updated November 7, 2026: one repository and one deployable application, with an HTTP API in front of the server services. The native clients below are possible future additions, not part of the assignment. So far only invitations use the API.

```mermaid
flowchart LR
    browser["Browser<br/>phone, tablet, desktop"]
    native["Future mobile/desktop clients<br/>not in assignment scope"]

    subgraph render["Render Free"]
        app["SvelteKit server<br/>Node runtime"]
        sockets["Socket.IO<br/>same process"]
        services["Application services<br/>business rules and permissions"]
        repositories["Repositories<br/>persistence queries and mappings"]
    end

    clerk["Clerk<br/>accounts, sessions,<br/>email verification"]
    atlas[("MongoDB Atlas Free<br/>profiles, histories, content,<br/>permissions, images")]
    dns["Cloudflare DNS"]

    dns -. domain .-> app
    browser -- "pages, API calls, uploads" --> app
    native -- "same HTTP API and uploads" --> app
    native <-- "WebSocket notices" --> sockets
    browser <-- "WebSocket notices" --> sockets
    browser -- "sign-in UI" --> clerk
    app -- "verify session" --> clerk
    sockets -- "verify handshake" --> clerk
    app -- "API handlers and web adapters" --> services
    services --> repositories
    repositories -- "official Node.js driver" --> atlas
    sockets -. "shared permission policy" .-> services
    sockets -. "notices published after a successful write" .- app
```

## Collections and relationships

Candidate model from the [MongoDB model](mongodb-model.md). D16 is still open: `ACADEMIC_HISTORY` may become an array embedded in `USERS` instead of its own collection. The relationships stay the same either way.

```mermaid
erDiagram
    INSTITUTIONS ||--o{ COURSES : offers
    COURSES ||--|| SPACES : "has one canonical"
    USERS }o--|| INSTITUTIONS : "primary institution"
    USERS ||--o{ ACADEMIC_HISTORY : records
    COURSES ||--o{ ACADEMIC_HISTORY : "recorded for"
    USERS ||--o{ MEMBERSHIPS : follows
    SPACES ||--o{ MEMBERSHIPS : "followed through"
    SPACES ||--o{ POSTS : contains
    USERS ||--o{ POSTS : authors
    POSTS ||--o{ REPLIES : has
    REPLIES |o--o{ REPLIES : "one level of nesting"
    POSTS ||--o{ IMAGES : "up to two"
    USERS ||--o{ REPORTS : files
    SPACES ||--o{ REPORTS : "scoped to"
    USERS ||--o{ MODERATOR_ASSIGNMENTS : holds
    SPACES ||--o{ MODERATOR_ASSIGNMENTS : "moderated by"
    USERS ||--o| INVITATIONS : redeems

    USERS {
        ObjectId _id PK
        string clerkUserId UK
        string username UK
        string displayName
        ObjectId primaryInstitutionId FK
        boolean primaryInstitutionHidden
        string role
        string state
    }
    ACADEMIC_HISTORY {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId courseId FK
        string status "Planning, Taking, Took"
        string term "season and year"
        string visibility "Private, Visible"
        string privateNote "owner only"
    }
    COURSES {
        ObjectId _id PK
        ObjectId institutionId FK
        string code
        string normalizedCode
        string title
    }
    POSTS {
        ObjectId _id PK
        ObjectId spaceId FK
        ObjectId courseId FK
        ObjectId authorId FK
        string kind "question, discussion, review"
        string title
        string bodyMarkdown
        object reviewData "workload, takeAgain, snapshot"
        ObjectId acceptedReplyId
        string state "published, removed, deleted"
        date lastActivityAt
    }
    REPLIES {
        ObjectId _id PK
        ObjectId postId FK
        ObjectId parentReplyId FK
        ObjectId authorId FK
        string bodyMarkdown
        string submissionId UK "prevents duplicate retries"
    }
    IMAGES {
        ObjectId _id PK
        ObjectId postId FK
        binary data
        string mimeType
        int byteSize
        string altText
    }
```

Collections not drawn: `institutions`, `spaces`, `memberships`, `reports`, and `moderatorAssignments` are small and shown only as relationships. `moderationActions` (audit log) and `profanityTerms` don't relate to content by key.

## Every request passes the same checks

Pages, API routes, image requests, and socket subscriptions all go through the same chain. Each step is a server-side check, not something the Svelte component decides.

```mermaid
flowchart TD
    request["Request: page, API, image, or socket subscription"]
    session{"Valid Clerk session?"}
    profile{"Admitted application user<br/>linked by clerkUserId?"}
    suspended{"Suspended?"}
    permission{"Allowed for this resource?<br/>owner, space moderator, or admin"}
    projection["Query with a narrow projection<br/>that returns only permitted fields"]
    signIn["Redirect to sign-in<br/>or 401"]
    invite["Show the invitation screen"]
    denied["403 or no-permission state"]

    request --> session
    session -- no --> signIn
    session -- yes --> profile
    profile -- no --> invite
    profile -- yes --> suspended
    suspended -- yes --> denied
    suspended -- no --> permission
    permission -- no --> denied
    permission -- yes --> projection
```

Owner-only data, meaning private history entries and notes, fails the permission check for everyone else, administrators included.

## Invitation and admission

An admin creates an application invitation in MongoDB. Clerk proves the person owns an email address, and the application then checks that the email matches the invitation. The link alone proves nothing.

```mermaid
sequenceDiagram
    actor Admin
    actor Student
    participant App as SvelteKit server
    participant Clerk
    participant DB as MongoDB

    Admin->>App: Create invitation for email
    App->>DB: Insert invitation (email, expiresAt = now + 7 days, single use)
    App-->>Admin: Copyable link
    Admin-->>Student: Sends link manually

    Student->>App: Open invitation link
    App-->>Student: Sign up or sign in with Clerk
    Student->>Clerk: Email/password sign-up and email verification
    Clerk-->>Student: Session
    Student->>App: Redeem invitation
    App->>Clerk: Read the user's verified email addresses
    App->>DB: Atomically mark invitation redeemed if it matches the email,<br/>is unexpired, unrevoked, and unused
    alt match and redeemed
        App->>DB: Create user profile linked by clerkUserId
        App-->>Student: Onboarding (username, display name, institution)
    else no match, expired, revoked, or already used
        App-->>Student: Clear error, no access
    end
```

## Writing content and the realtime notice

HTTP saves the data, and the socket only announces that something changed. Clients refetch from MongoDB, so a missed event never loses content.

```mermaid
sequenceDiagram
    actor Writer
    actor Reader
    participant App as SvelteKit server
    participant DB as MongoDB
    participant IO as Socket.IO

    Reader->>IO: Subscribe to course (authenticated handshake)
    IO->>IO: Check admission and access, join course room

    Writer->>App: POST reply (submissionId, Markdown)
    App->>App: Zod validation, permission, lock, and profanity checks
    App->>DB: Insert reply (unique submissionId) and bump thread lastActivityAt
    DB-->>App: Stored
    App-->>Writer: 201 with the stored reply
    App->>IO: Emit reply.created { postId, replyId } to the course room
    IO-->>Reader: Small notice, no content body
    Reader->>Reader: Show "1 new reply" without moving the page
    Reader->>App: Load new replies when the reader asks
    App->>DB: Query with the reader's permissions
    App-->>Reader: Replies

    Note over Reader,IO: After a reconnect, refetch the current view instead of replaying events
```

## Post lifecycle

How moderator removal and author deletion interact, from the [product spec](../product/product-spec.md#moderation-and-deletion).

```mermaid
stateDiagram-v2
    [*] --> Published
    Published --> Removed: Moderator removes
    Removed --> Published: Admin restores
    Removed --> Purged: Admin permanently deletes
    Published --> Deleted: Author deletes
    Removed --> Deleted: Author deletes
    Deleted --> [*]
    Purged --> [*]

    note left of Published
        The author can edit; the post
        shows an edited timestamp.
    end note
    note left of Removed
        Reason logged. Hidden from readers, search, statistics,
        and image delivery. Visible to assigned
        moderators and admins. The author can't edit.
    end note
    note right of Deleted
        Body and images erased. A "Post deleted"
        placeholder keeps the existing replies.
        Excluded from search and statistics.
    end note
```

Account deletion is separate: it anonymizes the user's remaining posts and reviews as "Deleted user" without changing their state.

## Review eligibility and statistics

Who can publish a review, and what goes into course statistics.

```mermaid
flowchart TD
    start["Write a review for a course"]
    existing{"Already has a review<br/>for this course?"}
    eligible{"Has a Taking or Took<br/>history entry for it?"}
    warn["Warn: publishing discloses self-reported<br/>status and term, even if the entry is private"]
    publish["Publish review with a fixed snapshot:<br/>course, status, term"]
    edit["Edit the existing review<br/>(feedback, workload, take again)"]
    blocked["Explain: add a Taking or Took entry first"]

    start --> existing
    existing -- yes --> edit
    existing -- no --> eligible
    eligible -- no --> blocked
    eligible -- yes --> warn --> publish

    publish --> stats[("Course statistics aggregate:<br/>published, nonremoved reviews only.<br/>Never history entries or notes.")]
    edit --> stats
```
