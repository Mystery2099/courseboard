# Security and data recovery plan

**Last reviewed:** November 8, 2026

The syllabus lists a security and data recovery plan as a course objective, and the [self-review questions](../course/lab-self-review-questions.md) ask whether the app follows industry security practices and is secure enough for its users. This is where I answer both. The privacy and permission rules themselves are in the [product spec](../product/product-spec.md#privacy-and-permissions); this file covers how the app protects them and how I'd recover if something went wrong.

## What needs protecting

The app doesn't handle payments or passwords directly, but it does hold things students wouldn't want exposed: private course history and notes, invitation email addresses, and the ability to moderate or administer other people's content. Clerk stores credentials and identity, so a breach of the app's database shouldn't leak passwords. The most realistic risks are a missing permission check, private data slipping into a response, and someone abusing an endpoint because nothing slows them down.

## OWASP Top 10

I'm using the [OWASP Top 10 (2021)](https://owasp.org/Top10/) as the industry checklist. **Done** means it exists in the code today; **planned** means it's part of the build but not implemented yet.

| Risk | How the app handles it | Status |
| --- | --- | --- |
| Broken access control | Every page, endpoint, form action, image request, and socket subscription checks the session, admission, suspension, and role on the server through shared access code. Identity and roles never come from request data. Administrators can't read private history | Done for invitations; planned for each feature as it's built |
| Cryptographic failures | Render and Atlas enforce TLS. Invitation tokens are 32 random bytes, and only their SHA-256 hash is stored. Clerk handles passwords and sessions | Done |
| Injection | Zod validates every request, so MongoDB operators can't sneak in through objects where strings are expected. Queries are built with the driver, never from strings. Markdown renders without raw HTML, and a Content Security Policy limits scripts | Validation done for invitations; CSP done; Markdown planned |
| Insecure design | Privacy rules are enforced through narrow database projections, not hidden in the UI. History, following, and content are separate records. Invitations require a matching verified email, so a forwarded link can't grant access | Designed; verified with separate-account tests in Stage 4 |
| Security misconfiguration | Secrets live in Render's dashboard and a local `.env` that git ignores. API writes require JSON and reject other origins, and API responses aren't cached. SvelteKit's built-in CSP support adds nonces to its scripts, and the response hook sets `X-Content-Type-Options`, `Referrer-Policy`, frame restrictions, `Permissions-Policy`, and HSTS | Done |
| Vulnerable and outdated components | CI runs `pnpm audit` on production dependencies and fails on high-severity advisories. The lockfile pins exact versions | Done |
| Identification and authentication failures | Clerk handles sign-up, required email verification, sessions, and brute-force protection on sign-in. Suspension denies requests and disconnects sockets. MFA is deferred because Clerk charges for it in production | Clerk done; suspension planned |
| Software and data integrity failures | Render only deploys `master` after CI passes. Uploaded images are decoded and re-encoded by Sharp, which strips metadata, rather than stored as uploaded | CI done; images planned |
| Logging and monitoring failures | Moderation actions record the actor, target, reason, and time. Render keeps application logs, and `/api/health` reports database reachability | Health check done; moderation log planned |
| Server-side request forgery | The server never fetches URLs supplied by users, and Markdown can't embed external images | Done by design |

## Abuse and limits

Free hosting makes abuse a practical problem, not just a security one: a flood of uploads could fill the 100 MB image quota, and a flood of posts could fill the database. The app runs on a single Render instance, so a simple in-memory rate limiter is enough. I'm planning limits on invitation redemption, image uploads, and creating posts, replies, and reports, plus the size limits already in the spec: bounded request bodies, Markdown length, two images per post, and 2 MB per image. Invitations already keep strangers out, which removes most of the spam risk.

## Data recovery

### What gets backed up

| Data | Where it lives | Recovery |
| --- | --- | --- |
| Application data, including images | MongoDB Atlas Free | Regular `mongodump` exports, described below |
| Accounts and credentials | Clerk | Clerk manages its own storage; MongoDB profiles link to Clerk user IDs |
| Code and configuration | GitHub | `render.yaml` and `.env.example` describe every setting |
| Secrets | Render dashboard and my local `.env` | Also kept in my password manager so they can be re-entered or rotated |

Atlas Free doesn't include automated cloud backups, so I'll export the database myself:

```sh
mongodump --uri "$MONGODB_URI" --gzip --archive="backup-$(date +%F).gz"
```

I'll run this weekly once real accounts exist, and before the demonstration, risky migrations, and the end of hosting. Backups stay on my own machine, never in the repository, because they include email addresses. I'll keep the last few and delete the rest.

To restore into the same cluster, or a new one if Atlas is unavailable:

```sh
mongorestore --uri "$MONGODB_URI" --gzip --archive=backup-YYYY-MM-DD.gz --drop
```

The app recreates its indexes on startup. **I'll test a restore at least once** before the demonstration, because an untested backup isn't much of a plan.

### What could go wrong

| Situation | Response |
| --- | --- |
| A bad deploy breaks the site | Roll back to the previous deploy in Render, then fix it on a branch |
| Data is deleted or corrupted | Restore the latest backup; anything after it is lost, which is acceptable for an assignment with fictional data |
| Atlas pauses the idle free cluster | Resume it from the Atlas dashboard |
| A secret leaks | Rotate the Clerk keys or MongoDB password, update Render and `.env`, and redeploy |
| A free-tier limit is reached | Uploads fail clearly at the image quota while existing content keeps working; check usage before the demo |
| Hosting ends after grading | Take a final backup, then delete the Render service, Atlas cluster, and Clerk application |
