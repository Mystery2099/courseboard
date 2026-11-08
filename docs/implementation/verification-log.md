# Verification log

**Last updated:** November 8, 2026

This is the record of what has actually been checked, how, and when, so nobody has to ask again. The [roadmap](roadmap-and-acceptance.md) lists what still needs checking; this file holds the evidence. Add a row whenever something is verified, and move it out of "Not verified yet" instead of deleting it.

## Deployment

| Fact | Value |
| --- | --- |
| Public URL | https://courseboard.mathewtech.us (DNS on Cloudflare, certificate issued by Render) |
| Render URL | https://courseboard.onrender.com, the same service |
| Render service | `courseboard`, Free plan, Virginia, deploys `master` after CI passes ([`render.yaml`](../../render.yaml)) |
| Database | MongoDB Atlas Free, AWS us-east-1, database `academic_platform` |
| Clerk | **Development instance** (`pk_test_` keys). Moving to a production instance on `mathewtech.us` is open question D21 |

## Verified

| Date | What | How | Result |
| --- | --- | --- | --- |
| Nov 8, 2026 | Render reaches Atlas | `GET /api/health` on both URLs | `{"status":"ok","databaseReachable":true}` |
| Nov 8, 2026 | WebSockets pass through Render and Cloudflare | Node `socket.io-client`, WebSocket transport only, against both URLs | Handshake reached the server |
| Nov 8, 2026 | Socket handshakes fail closed | Same client with a fake token | Rejected with `unauthenticated` |
| Nov 8, 2026 | Custom domain | Render shows it verified with an issued certificate; the page loads | Works |
| Nov 8, 2026 | Security headers and CSP | Local production build with the development Clerk key, checked with curl and headless Chromium on `/` | All headers present; Clerk loads with no CSP violations while signed out |

## Not verified yet

These come from Stage 0 of the roadmap. Each needs the deployed site and, where noted, two separate browser profiles.

- Payment details: confirm that none of Render, Atlas, or Clerk has asked for a card.
- Clerk sign-up, email verification, sign-in, sign-out, and protected routes on the deployed site.
- Signed-in CSP behavior: Clerk's sign-up bot check (Cloudflare Turnstile), profile images, and the account menu.
- A signed-in browser opening an authenticated Socket.IO connection, including after a cold start and after the session token expires.
- Invitation redemption on the deployed site: wrong email, expired, revoked, reused, and forwarded links (two profiles).
- Protected image upload and retrieval, including a signed-out request. Not built yet; waits on the input limits (D19).
- TanStack Query caching isolated by account, with one client per server render.
- A restore from backup.

## Testing notes

- **The CSP is fixed at build time.** It takes Clerk's Frontend API host from `PUBLIC_CLERK_PUBLISHABLE_KEY` during `pnpm build`, so changing Clerk keys needs a rebuild. Render rebuilds when environment variables change. CI builds with the placeholder key and logs a warning; that build is never deployed.
- **Clerk needs extra CSP sources:** its Frontend API host, `cdn.protect.clerk.com` for the bot-protection script, `*.protect.clerk.com` on any port for its probes and frames, `img.clerk.com`, and `challenges.cloudflare.com`. They're in [`server/ContentSecurityPolicyDirectives.js`](../../server/ContentSecurityPolicyDirectives.js).
- **Running the production build over plain HTTP locally:** adapter-node assumes HTTPS unless `PROTOCOL_HEADER` names a header, so Clerk's handshake redirects to `https://localhost` and fails. Start with `PROTOCOL_HEADER=x-local-proto` and send `x-local-proto: http` on requests to localhost, or use `pnpm dev`.
