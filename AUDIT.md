# CasaClean — Security & Optimization Audit

**Scope:** `server/` (Express 5 + Mongoose 9 REST API)
**Date:** 2026-07-02
**Focus:** Security posture and performance/optimization of the booking system.

---

## Overall assessment

The backend is well-built on the fundamentals:

- JWT stored in an httpOnly cookie; role is **re-loaded from the DB per request**, never carried in the token.
- Fail-closed reference resolution for service/city/add-ons (`resolveServiceAndCity`, `resolveSpecialRequests`).
- **Server-side pricing** — client totals are never trusted (`buildValidatedBookingDraft`).
- Zod `.strict()` validation + field whitelisting (no `req.body` spreads → no mass assignment).
- Custom-header CSRF pattern (`X-Requested-With`) backing `SameSite=None` cookies.
- Anti-enumeration on signin/resend (constant-work bcrypt, generic messages).
- Stripe webhook signature verification + idempotent promotion (`promotePendingBooking`).

The items below are the remaining gaps, ranked by impact.

---

## Security issues

### S1 — `COOKIE_EXPIRES` is used but never validated → "Remember me" silently breaks
**Severity:** Medium · **Files:** `server/controllers/auth.controller.js:80`, `server/utils/env.util.js:31-37`

`setTokenCookie` computes:

```js
maxAge: process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
```

but `COOKIE_EXPIRES` is **not** in the `assertEnv` required list. If it is missing or non-numeric, `maxAge` becomes `NaN`, producing an invalid `Max-Age`/`Expires` — browsers then drop the cookie or downgrade it to a session cookie. The single env var that governs session lifetime is the one not fail-fast checked.

**Fix:** Add `COOKIE_EXPIRES` to `assertEnv`, validate it is a positive number, and coerce with `Number(...)` plus a sane fallback.

---

### S2 — Public listing endpoints leak soft-disabled records
**Severity:** Low–Medium · **Files:** `server/controllers/service.controller.js:99-108`, `server/controllers/city.controller.js`

`getServices` and `getCities` run `.find()` with **no `enabled: true` filter**, so records toggled off via the admin soft-disable switch are still returned to unauthenticated visitors and shown in the booking wizard.

Booking itself fails closed (`resolveServiceAndCity` rejects disabled records), so this is not an integrity hole — but it exposes internal state and surfaces unavailable options.

**Fix:** Filter `enabled: true` for public callers; let admin requests (or an explicit query flag) see everything.

---

### S3 — User enumeration on signup
**Severity:** Low · **File:** `server/controllers/auth.controller.js:123-127`

Signup returns distinct messages for "email already exists" vs "phone already exists", which contradicts the deliberate anti-enumeration work done on signin/resend. Rate-limited to 10/hr, so low severity, but inconsistent with the codebase's stated posture.

**Fix:** Use a single generic message, or accept the tradeoff explicitly.

---

### S4 — Review routes bypass the validation layer
**Severity:** Low · **File:** `server/routers/review.router.js:25-28`

`createReview` / `editReview` / `deleteReview` have **no `validate(schema)` middleware and no rate limiter**, unlike every other resource. Manual checks + `sanitizeMongo` keep it from being exploitable today, but there is no `.strict()` field whitelist and no per-route limit.

**Fix:** Add Zod schemas (`rating`, `review_text` with length caps) and a rate limiter, matching the other routers.

---

### S5 — `sanitizeMongo` does not cover `req.query` (defense-in-depth note)
**Severity:** Info · **File:** `server/middlewares/sanitize.middleware.js`

Acknowledged in-code (Express 5 makes `req.query` a read-only getter). No current endpoint passes raw query into a Mongo filter, so it is safe today — but it is a landmine for any future endpoint that filters by a query param.

**Fix:** Add a guard/comment; sanitize query values at the point they are used in a Mongo filter.

---

## Optimization issues

### O1 — Service images stored as base64 data URLs in MongoDB (highest impact)
**Severity:** High · **Files:** `server/models/service.model.js:34`, `server/app.js:103`

`image` is stored as an inline data URL, which is why the JSON body limit was raised to 4 MB. The **public** homepage `getServices` then returns every service with its full multi-MB blob on every load, with no CDN/caching. This bloats documents, inflates the working set, and wastes bandwidth.

**Fix:** Move images to object storage / a CDN and store only a URL. At minimum, exclude `image` from the list projection and add HTTP cache headers.

---

### O2 — Unfiltered `countDocuments()` on every list request
**Severity:** Medium · **Files:** `server/controllers/booking.controller.js:81`, `server/controllers/service.controller.js:107`, `server/controllers/worker.controller.js:28`, `getAllReviews`

These call `countDocuments()` with **no filter**, which is a full collection scan each time.

**Fix:** Use `estimatedDocumentCount()` for unfiltered totals (metadata-based, O(1)). Keep `countDocuments()` only where a real filter is applied (e.g. `getMyBookings`).

---

### O3 — `getAllUsers` returns the entire users collection, unpaginated
**Severity:** Medium · **File:** `server/controllers/auth.controller.js:213`

`User.find().sort(...).lean()` has no `skip`/`limit`; payload and memory grow linearly with signups. Every other list endpoint is paginated.

**Fix:** Add pagination consistent with the other list endpoints.

---

### O4 — No availability / double-booking check
**Severity:** Medium (domain correctness) · **Files:** booking creation flow (`booking.controller.js`, `services/booking.service.js`)

Nothing checks for time-slot conflicts or worker overlap — any number of bookings can be created for the same slot, and a worker can be assigned to concurrent jobs. May be intentional MVP scope, but it is both a correctness gap and a resource-exhaustion vector.

**Fix:** Decide whether slot-conflict prevention is in scope; if so, add an overlap check on booking create/edit.

---

### O5 — Minor cleanups
**Severity:** Low

- **Unused indexes** add write overhead with no read benefit: `bookingSchema.index({ customerEmail: 1 })` and `userSchema.index({ role: 1, isVerified: 1 })` have no matching query in the controllers.
- **`server/config/db.config.js:3`** forces global Google DNS (`8.8.8.8`) — can break in environments with private/internal DNS or where `8.8.8.8` egress is blocked.
- **`server/app.js:168`** handles `unhandledRejection` but not `uncaughtException`.

---

## Suggested priority order

| # | Item | Why |
|---|------|-----|
| 1 | **O1** — base64 images | Largest real-world perf/cost impact |
| 2 | **S1** — `COOKIE_EXPIRES` | Quick fix; prevents silent session breakage |
| 3 | **S2 / O3** — leak + unbounded query | Small, self-contained changes |
| 4 | **O2, S3, S4** — consistency/hardening | Aligns with existing conventions |
| 5 | **O4** — slot-conflict prevention | Requires a product decision |

**Low-risk first batch to implement:** S1, S2, O2, O3 (all self-contained). Tackle O1 (images) separately, as it touches the storage model and the frontend.
