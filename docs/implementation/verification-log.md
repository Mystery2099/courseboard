# Verification log

**Last updated:** November 14, 2026

This is the record of what has actually been checked, how, and when, so nobody has to ask again. The [roadmap](roadmap-and-acceptance.md) lists what still needs checking; this file holds the evidence. Add a row whenever something is verified, and move it out of "Not verified yet" instead of deleting it.

## Deployment

| Fact | Value |
| --- | --- |
| Public URL | https://courseboard.mathewtech.us (DNS on Cloudflare, certificate issued by Render) |
| Render URL | https://courseboard.onrender.com, the same service |
| Render service | `courseboard`, Free plan, Virginia, deploys `master` after CI passes ([`render.yaml`](../../render.yaml)) |
| Database | MongoDB Atlas Free, AWS us-east-1, database `academic_platform` |
| Pull request previews | Render builds a preview deployment for each pull request, against the same Atlas database and Clerk instance |
| Clerk | **Development instance** (`pk_test_` keys). Moving to a production instance on `mathewtech.us` is open question D21 |

## Verified

| Date | What | How | Result |
| --- | --- | --- | --- |
| Nov 14, 2026 | Review changes rechecked before pushing | Reran `pnpm check`, `pnpm lint`, `git diff --check`, `pnpm build`, and `pnpm exec vitest run` against a new throwaway MongoDB 8.0 replica set. Read the review service, repository, routes, and the post listing and page loader changes | All passed; 116 tests, including the browser and MongoDB checks. The code review found no defects. Creating a review checks for an existing one before the history entry, and the unique index handles concurrent attempts. Editing matches only the author's published review. Removed and deleted posts are hidden from lists, pages, and replies. Unanswered still accepts only questions. A review page opened under another course or channel returns 404 |
| Nov 14, 2026 | Review list and composer in a browser, without the server | `ReviewForm.svelte.spec.ts` in headless Chromium, with stubbed API clients and the application stylesheet | At 360 × 640 the composer expanded, required disclosure acknowledgement, kept failed text, retried the same fields, refreshed the list, and offered the existing review after success. No horizontal page overflow in that state. At 728px the edit form kept status and term fixed and sent only feedback and ratings |
| Nov 14, 2026 | Local checks for reviews | `pnpm check`, `pnpm lint`, `git diff --check`, `pnpm build`, and `pnpm exec vitest run` with `TEST_MONGODB_URI` pointing to the throwaway local replica set | Type checking, lint, and the production build passed; 116 tests passed, including the two browser checks and the MongoDB integration check |
| Nov 14, 2026 | Reviews in MongoDB, without the deployed application | `ReviewWorkflow.integration.spec.ts` against a throwaway local MongoDB 8.0 replica set, using the real review, post, history, and reply services and repositories | Four concurrent submissions stored one review. Planning, another user's entry, and an entry for another course were refused. Publishing left private history and following unchanged. Only the author could edit, including after deleting the source history; status, term, and activity stayed fixed. Published-review statistics excluded removed/deleted records and updated after rating edits. Reviews appeared in Overview and allowed replies, but not an accepted answer. The course review query used `IXSCAN` |
| Nov 14, 2026 | Review form rules and HTTP access checks | `ReviewService.spec.ts`, the general-post eligibility-bypass test, and `PostApi.spec.ts` | Disclosure acknowledgement and valid ratings are required. Forged authors and participation fields are ignored. Unadmitted/suspended accounts and cross-origin review writes are refused. Conflicts return 409 with no-store responses. Other authors and administrators cannot edit someone else's review |
| Nov 14, 2026 | Review workflow design preview, not application functionality | Rendered the default list option in `docs/design/review-workflow-options.html` at 728px and 360px with the HTML preview tool | The default layout fits both widths and reports no console messages. The writing-page and inline alternatives, form interactions, and real review functionality have not been verified |
| Nov 14, 2026 | Questions and discussions in a signed-in browser | Checked by hand on Render's preview deployment for PR #14 | Worked as expected. Which actions were tried, and whether a second account or an administrator's lock was part of it, wasn't written down |
| Nov 14, 2026 | Threads in MongoDB | The real `PostService` and `ReplyService` against a throwaway MongoDB 8.0 replica set (podman): two students and an administrator posting, replying, accepting, and locking | A reply to a nested reply or under another post's reply is refused. Four simultaneous requests with one `submissionId` stored one reply. After six concurrent replies `replyCount` matched the stored replies. Only the asker could accept, and only a reply of that question; a discussion has no accepted reply. A member couldn't lock; a locked thread refused replies and took them again once unlocked. Accepting and locking left `lastActivityAt` unchanged. Authors came back as username and display name only |
| Nov 14, 2026 | Post and reply paging | Same container with 48 posts and 71 replies, following `nextCursor` to the end | Overview, Newest, Unanswered, and replies each returned every item once, in order |
| Nov 14, 2026 | Post and reply queries use their indexes | `explain('executionStats')` in the same container | Questions by activity: `IXSCAN`, 21 keys for 21 posts. Overview: `SORT_MERGE` over one `IXSCAN` per kind, 22 keys. Newest and Unanswered sorted 32 posts in memory until `(spaceId, kind, createdAt, _id)` was added; then `IXSCAN` with 21 and 22 keys. Replies: `IXSCAN` on `(postId, _id)` |
| Nov 14, 2026 | Thread page behavior in a browser, without the server | The thread and list components in headless Chromium with a stubbed API | A reply whose request failed stayed on the page as not sent; Retry sent the same `submissionId` and the reply appeared once. A nested reply, accepting an answer, and locking updated the page, and a locked thread had no reply box |
| Nov 14, 2026 | Post and reply service rules | Unit tests in `PostService.spec.ts`, `ReplyService.spec.ts`, and `PostApi.spec.ts` | Posts and replies belong to the caller whatever the body claims; accounts without admission or a profile are refused; cross-origin writes and a member's lock request are refused |
| Nov 11, 2026 | Onboarding course step in a signed-in browser | Render's preview deployment for PR #13, signed in as `@kennedmr` and opening `/onboarding/courses` directly | Add to history recorded a private Taking, Fall 2026 entry and Follow added the course to the followed list, each without the other; both could be undone on the page. After a reload the entry showed as recorded but could no longer be removed there. Reaching the step from step 2 with a new account wasn't part of this check |
| Nov 11, 2026 | School setting in a signed-in browser | Same preview and account: Hide on the profile page, then `/users/kennedmr`, `GET /api/users/kennedmr`, and Explore | The public page and API response had no primary institution, the school with a visible entry was still listed, the own profile kept it, and Explore still opened on it. Show restored it. A second account wasn't used |
| Nov 11, 2026 | Hidden primary institution in MongoDB | The real `ApplicationUserRepository` against a throwaway MongoDB 8.0 container (podman): onboard a user, hide the school, then show it again while renaming | The public profile record has the institution before and no institution while hidden; the owner's own profile keeps it with `isPrimaryInstitutionHidden` true; showing it again and changing the display name in one update both apply. An account without a profile can't be updated |
| Nov 11, 2026 | Hidden primary institution service rules | Unit tests in `UserProfileService.spec.ts` | A hidden school is left out of the public profile without an institution lookup, also for the owner; changing visibility writes only that field |
| Nov 8, 2026 | Student profile pages with two accounts | Render's preview deployment for PR #12, signed in as `@kennedmr` and `@mar` and opening each other's `/users/{username}` page | Each saw only the other's visible entries, with course, status, and term and no notes. A school other than the primary one appeared only through a visible entry. A Clerk photo loaded for the account that has one; the account without one showed initials |
| Nov 8, 2026 | Public profile service rules | Unit tests in `UserProfileService.spec.ts` | Another user's profile has only username, display name, photo, primary institution, and `isOwnProfile`; unknown or malformed usernames return nothing |
| Nov 8, 2026 | Academic history in a signed-in browser | Checked by hand in a local signed-in session: adding from a course page and the profile, editing, deleting, and Preview as others | Worked as expected. A second account viewing visible entries wasn't part of this check |
| Nov 8, 2026 | History privacy in MongoDB | The real `AcademicHistoryRepository` against a throwaway MongoDB 8.0 container (podman), with one visible and one private entry | Owner query returns both; the visible query returns only the visible entry with `_id`, course, status, and term, without notes; another user's update and delete match nothing |
| Nov 8, 2026 | History query uses its index | `explain()` on `{ userId, visibility: 'visible' }` in the same container | `IXSCAN` on `userId_1_courseId_1`, with visibility filtered after the fetch |
| Nov 8, 2026 | History service rules | Unit tests in `AcademicHistoryService.spec.ts` | New entries are private and belong to the caller; Taking and Took require a term; unknown courses and usernames write or read nothing; unadmitted accounts are refused |
| Nov 8, 2026 | Changing schools after onboarding | Source inspection of `UserProfileService` and `UserProfileContract` | Not supported: profile updates accept only the display name, and repeat onboarding leaves the existing profile unchanged. Not browser-tested. |
| Nov 8, 2026 | Render reaches Atlas | `GET /api/health` on both URLs | `{"status":"ok","databaseReachable":true}` |
| Nov 8, 2026 | WebSockets pass through Render and Cloudflare | Node `socket.io-client`, WebSocket transport only, against both URLs | Handshake reached the server |
| Nov 8, 2026 | Socket handshakes fail closed | Same client with a fake token | Rejected with `unauthenticated` |
| Nov 8, 2026 | Custom domain | Render shows it verified with an issued certificate; the page loads | Works |
| Nov 8, 2026 | Security headers and CSP | Local production build with the development Clerk key, checked with curl and headless Chromium on `/` | All headers present; Clerk loads with no CSP violations while signed out |
| Nov 8, 2026 | Clerk telemetry is off | The deployed console showed CSP blocks on `clerk-telemetry.com`. Local production build in headless Chromium with `navigator.webdriver` hidden, reading `Clerk.telemetry.isEnabled` with and without the change | On before, off after; no telemetry requests |
| Nov 8, 2026 | Username uniqueness | The repository's index definition and onboarding update run with `mongosh` against a throwaway MongoDB 8.0 container | Accounts without usernames coexist; a second claim on a taken name fails with a duplicate key, which the app reports as unavailable; an onboarded user can't overwrite their profile |
| Nov 8, 2026 | Clerk name fields off | Development instance config patched through the Clerk API after a dry run; the response shows `user_model.first_name` and `last_name` changed from enabled to disabled | Applied. Clerk's Update profile panel itself hasn't been looked at since |

## Not verified yet

These come from Stage 0 of the roadmap. Each needs the deployed site and, where noted, two separate browser profiles.

- Payment details: confirm that none of Render, Atlas, or Clerk has asked for a card.
- Clerk sign-up, email verification, sign-in, sign-out, and protected routes on the deployed site.
- Signed-in CSP behavior: Clerk's sign-up bot check (Cloudflare Turnstile), profile images, and the account menu.
- A signed-in browser opening an authenticated Socket.IO connection, including after a cold start and after the session token expires.
- Onboarding on the deployed site: the redirect for an account without a profile, a taken username, and Explore opening on the chosen school.
- Invitation redemption on the deployed site: wrong email, expired, revoked, reused, and forwarded links (two profiles).
- Protected image upload and retrieval, including a signed-out request. Not built yet; waits on the input limits (D19).
- TanStack Query caching isolated by account, with one client per server render. The cache now clears when the Clerk user changes; not yet watched in a browser.
- A new account finishing onboarding step 2 and landing on the course step, with Skip and Continue opening Explore.
- A second account confirming a hidden school is gone from `/users/{username}` (two profiles).
- Questions and discussions with two accounts: a second account replying to and reading a thread, and being refused once an administrator locks it (two profiles).
- Reviews on a deployed preview: disclosure, repeated attempts, existing-review editing, statistics, and a second account reading and replying without seeing private history.
- A restore from backup.

## Testing notes

- **The CSP is fixed at build time.** It takes Clerk's Frontend API host from `PUBLIC_CLERK_PUBLISHABLE_KEY` during `pnpm build`, so changing Clerk keys needs a rebuild. Render rebuilds when environment variables change. CI builds with the placeholder key and logs a warning; that build is never deployed.
- **Clerk needs extra CSP sources:** its Frontend API host, `cdn.protect.clerk.com` for the bot-protection script, `*.protect.clerk.com` on any port for its probes and frames, `img.clerk.com`, and `challenges.cloudflare.com`. They're in [`server/ContentSecurityPolicyDirectives.js`](../../server/ContentSecurityPolicyDirectives.js).
- **Clerk telemetry is turned off** in the root layout instead of allowed in the CSP. Clerk sends it only from development instances, and it skips automated browsers, so checking it in headless Chromium means hiding `navigator.webdriver`.
- **Running the production build over plain HTTP locally:** adapter-node assumes HTTPS unless `PROTOCOL_HEADER` names a header, so Clerk's handshake redirects to `https://localhost` and fails. Start with `PROTOCOL_HEADER=x-local-proto` and send `x-local-proto: http` on requests to localhost, or use `pnpm dev`.
