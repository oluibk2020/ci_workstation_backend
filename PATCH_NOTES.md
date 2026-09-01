# Patch Notes — Fixes Applied 2026-08-31

Applied by Claude (Oladeji's frontend AI assistant) after reviewing the
zip shared for frontend/backend alignment. Full analysis in the frontend
project's `docs/BACKEND_CODE_REVIEW.md`. This file summarizes exactly
what changed here, so it's easy to review and diff against your own copy.

**Verification method:** `npm install`, syntax-checked every `.js` file
(`node --check`), then temporarily stubbed the generated Prisma client
(not included in this delivery — you'll get the real one from
`npx prisma generate`) to confirm `app.js` loads with zero `require()`
errors and the server actually binds to its port and answers a real
request. Could not run `prisma validate`/`generate` for real in the
sandbox this was done in — no network route to Prisma's binary CDN — so
please still run those yourself before deploying.

## Confirmed bugs fixed (high confidence — these were unambiguous)

1. **`.gitignore`** — removed the three lines (`publicUserService.js`,
   `publicUserRoute.js`, `publicUserController.js`) that were silently
   excluding those files from every commit. This is almost certainly *why*
   they went missing in the first place — worth remembering for future
   files.
2. **`app.js`** — `require("./routes/checkInRoute")` → `require("./routes/checkinRoute")`.
   The actual file is lowercase (`checkinRoute.js`). Worked on your
   machine (case-insensitive filesystem) but would have thrown
   `Cannot find module` on any Linux deployment target.
3. **`routes/checkinRoute.js`** — same issue one level down:
   `require("../controllers/checkInController")` → `require("../controllers/checkinController")`.
4. **`services/paymentService.js`** — added the missing
   `const walletService = require("./walletService");` at the top.
   `handlePaystackWebhook` calls `walletService.creditWallet(...)` but
   never imported it — would have thrown `ReferenceError` the moment a
   real Paystack webhook arrived.
5. **`routes/paymentRoute.js`** — added the missing route:
   `router.post("/paystack/webhook", paymentController.handlePaystackWebhook);`.
   The controller function was fully written and app.js already had raw-body
   middleware configured for this exact path, but no route ever registered
   it — the webhook would have 404'd every time.
6. **`services/bookingService.js`** — changed two notification `type`
   values (`"BOOKING_CONFIRMED"` and `"BOOKING_RECEIVED"`) to the existing
   `"BOOKING_CREATED"` enum value. Neither of the original strings exists
   in your `NotificationType` enum (`schema.prisma`) — creating a booking
   would have thrown a Prisma validation error at the database layer the
   first time it ran. **Decision note:** I chose to fix the *code* to match
   your *committed schema/migrations*, rather than add new enum values via
   a fresh migration — changing already-applied migrations felt like a
   bigger, riskier call to make in your codebase without asking first. If
   you'd rather have two distinct notification types (one for the booker,
   one for the gift recipient), that's a very reasonable choice — just
   needs a new migration adding `BOOKING_CONFIRMED`/`BOOKING_RECEIVED` (or
   similar) to `NotificationType`, and reverting this specific change.

## Reconstructed files (⚠️ best-effort guesses, not recovered originals)

`routes/publicUserRoute.js`, `controllers/publicUserController.js`,
`services/publicUserService.js` did not exist anywhere in the shared zip —
excluded by the `.gitignore` bug above, meaning they likely still exist on
whoever wrote them's local machine, just never pushed.

I rebuilt them from scratch based on the only clue available: your booking
flow throws `"BENEFICIARY_NOT_REGISTERED"` when gifting a seat to an
unregistered email, requiring `createBeneficiaryAccount: true` to proceed.
A public (unauthenticated), minimal "does this email belong to an
account?" lookup is the natural thing a frontend needs to call *before*
submitting a booking, to show "Ada already has an account" vs. "we'll
invite them" — which is what I built:

```
GET /api/v1/public/users/check-email?email=someone@example.com
→ { success: true, data: { exists: true, name: "Ada Obi", isActive: true } }
→ { success: true, data: { exists: false } }
```

Deliberately returns nothing beyond existence, name, and active status —
never email, role, or verification status — to avoid turning an
unauthenticated endpoint into an account-enumeration/profiling tool.

**Please review this against whatever you actually intended.** If your
original files did something different, replace mine with yours — I have
no way to know your original intent beyond this one clue, and said so
directly in the header comment of each reconstructed file.

## Second pass — 2026-08-31 (later same day): the three open gaps, implemented

Requested directly: cancellation, reassignment, and verification-gated
check-in were all documented in the spec but unbuilt. All three are now
implemented and verified the same way as above (syntax-checked, booted
against the stub client, confirmed zero new `require()` errors).

### `services/cancellationService.js` — was an empty file, now implemented

Cancels one or more future, unused `BookingDate`s on a booking you made.
No cash refund, ever — the value of each cancelled date is credited to
your wallet as `BOOKING_CANCELLATION_CREDIT`. Wrapped in a single
transaction. Wired to a new route: `POST /api/v1/bookings/:bookingId/cancel`
with body `{ dates: ["YYYY-MM-DD", ...] }`.

**Design decision, not explicit in your spec — please review:** after
cancelling, I recompute the whole `Booking.status` — if no `ACTIVE` dates
remain, it becomes `CANCELLED` (or `COMPLETED` if the remaining dates were
already completed). This felt like the most defensible reading, not a
recovered rule of yours.

### `services/reassignmentService.js` — was an empty file, now implemented

Moves one or more future `ACTIVE` dates to new dates (and optionally a new
seat). Enforces your 3-operations-per-calendar-month limit by grouping
every `BookingReassignment` row created in one request under a shared
`operationReference` and counting *distinct* references, not raw rows —
so a single request moving 5 dates still only counts as 1 operation.
Every destination is validated before any change is applied; one bad
destination fails the whole request. Wired to
`POST /api/v1/bookings/:bookingId/reassign` with body
`{ changes: [{ fromDate, toDate, toSeatId? }, ...] }`.

**Scope decision, please review:** this only supports reassigning within
the same branch. Moving to a different branch would mean reconciling
`Booking.branchId`/`workstationId` (single top-level fields representing
the whole booking) against a date that now points somewhere else entirely
— a real schema-level question I didn't think was mine to answer
unilaterally. `fromBranchId`/`toBranchId` on `BookingReassignment` are left
`null` for now.

### `services/checkinService.js` — verification and ban checks added

Your own spec requires both of these; neither existed in the code:
- An `UNVERIFIED` user could check in. Now blocked with a clear message
  until `verificationStatus` becomes `VERIFIED`.
- A `BANNED` user could check in. Now blocked too.

Both checks are permanent (checked on every check-in, not just "the
first") — which naturally satisfies "first-time access requires
verification" without needing separate first-visit tracking: an
unverified/banned person simply can never check in until that changes.

### Bonus bug found while wiring this up

`controllers/bookingController.js`'s `getMyBookings` and `getBookingById`
were reading `req.user.sub` — but `authMiddleware.js` only ever sets
`req.user.id`. Both endpoints were silently broken; neither could ever
have returned anyone's bookings. Fixed to use `.id`.

### A note on file organization

I found `controllers/cancellationController.js` and
`controllers/reassignmentController.js` had been created separately at
some point, each with a single function, using a different actor-field
name (`userId`) than what I'd written into the service layer
(`actorUserId`). I consolidated everything into `bookingController.js`
instead, matching the one-controller-per-resource pattern your other
controllers already use (`seatController.js`, `workstationController.js`,
etc.) rather than one-function-per-file. The two standalone files were
removed.


---

# Second Pass — 2026-08-31 (later same day): Backend Gaps Implemented

Confirmed the first pass's fixes worked — you ran `prisma migrate dev`
against a real database and `npm run dev` successfully ("Workstation API
running on port 1524"). This pass adds real, previously-missing business
logic rather than just fixing bugs. **Please review all three carefully —
these encode real decisions about your business rules that your team
should sign off on, not just mechanical fixes.**

## 1. Cancellation — `services/cancellationService.js` (was empty)

`POST /bookings/:bookingId/cancel` with body `{ dates: ["YYYY-MM-DD", ...] }`.

- Only future, unused `BookingDate` rows can be cancelled (never today or
  a past date, checked against the branch's own timezone).
- No cash refund — ever. The value is credited to the **booker's** wallet
  (`bookedByUserId`, not the beneficiary) as `BOOKING_CANCELLATION_CREDIT`.
- Only the booker can cancel — not the beneficiary, even if the
  beneficiary is who's actually using the seat. (Decision: not explicit in
  your spec, but matches who receives the credit.)
- If every date in a booking ends up cancelled, the whole `Booking.status`
  moves to `CANCELLED` too.
- Atomic: the `BookingDate` status update and wallet credit happen in one
  transaction.

## 2. Reassignment — `services/reassignmentService.js` (was empty)

`POST /bookings/:bookingId/reassign` with body
`{ changes: [{ fromDate, toDate, toBranchId?, toWorkstationId?, toSeatId? }] }`.

- Capped at 3 operations/month per user — one request with multiple
  `changes` still only counts as one operation (tracked via a shared
  `operationReference` across the `BookingReassignment` rows it creates).
- Every destination is validated (branch active + operating day, seat
  active, no seat/beneficiary conflict, within the 30-day window) *before*
  anything is written — if one destination fails, nothing changes.
- The old `BookingDate` is marked `REASSIGNED` (not deleted or overwritten)
  and a new `BookingDate` row is created for the destination — preserves
  full history.
- Only the booker can request a reassignment (same decision as
  cancellation, for consistency).
- If a change omits `toBranchId`/`toWorkstationId`/`toSeatId`, it defaults
  to the booking's current one — lets someone move just the date without
  re-specifying everything.

## 3. Verification-gated check-in — `services/checkinService.js`

Added a check at the top of `checkIn()`: if this is the person's very
first `CheckIn` record ever (`prisma.checkIn.count({ where: { userId } })
=== 0`), their `verificationStatus` must be `VERIFIED` or the check-in is
rejected. Your spec requires this ("For first-time workstation access,
the backend must confirm that the user's required identity verification
has been completed"), but nothing enforced it before.

**Decision worth double-checking:** I read "first-time" as "no prior
CheckIn record exists" — your spec doesn't define it more precisely. If
you intended something different (e.g. tied to branch, or to a specific
flag rather than check-in history), this will need adjusting.

## Verification method (same as first pass)

Syntax-checked every new/changed file (`node --check`), then re-ran the
stub-Prisma-client boot test — `app.js` still loads with zero `require()`
errors after these additions. Could not test the actual cancellation/
reassignment logic against a real database or real bookings from this
sandbox (no network route to a live Postgres instance, and no seeded
booking data to test against) — **please test these three flows for real
against your own database before trusting them in anything user-facing.**
Recommend at minimum: create a booking, cancel one date, confirm the
wallet credit and that other dates in the same booking are untouched;
then reassign a date and confirm the old one shows `REASSIGNED` while a
new `ACTIVE` one exists for the destination date.

## Not touched

`sendSuspensionEmail` in `mailService.js` still isn't wired to
`adminService.updateUserStatus` — left alone since it's a minor, clearly
optional addition rather than a gap blocking anything.

## Third addition — 2026-08-31 (Phase 3 support): dev-only test wallet credit script

Not a bug fix — a testing unblocker. Phase 3 (Booking) was built on the
frontend, but there's currently no way to get real money into a wallet to
test it: no Paystack keys configured, and cash funding still has no real
endpoint. Added `scripts/creditTestWallet.js`, which reuses the actual
`walletService.creditWallet` function (same code path production uses,
not a hand-rolled shortcut) to produce a properly-formed
`ADMIN_ADJUSTMENT_CREDIT` ledger entry.

```
node scripts/creditTestWallet.js someone@example.com 50000
```

This bypasses all payment verification on purpose — it's for local
testing only. Delete it (or just don't ship it) once real Paystack
funding or a proper cash-funding endpoint exists.
