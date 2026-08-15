# CasaClean Server — Security Review

**Scope:** `server/` (Express 5 + Mongoose API). Excludes `node_modules`.
**Date:** 2026-06-11
**Reviewer:** Security review (code reading / pentest perspective)

This document lists the security problems found in the current server
implementation, ordered by severity, with the affected location, an explanation
of the risk, and a recommended fix.

---

## Severity summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | No CSRF protection on cookie-authenticated, state-changing endpoints | **High** |
| 2 | No rate limiting anywhere (brute force, credential stuffing, email bombing) | **High** |
| 3 | Auth cookie is not `Secure`/`SameSite=None` under standard `NODE_ENV=production` | **High** |
| 4 | NoSQL injection on unvalidated admin endpoints (`POST/PATCH /auth/users`) | **Medium** |
| 5 | No security headers (no `helmet`) | **Medium** |
| 6 | CORS misconfiguration when `CLIENT_URL` is unset (reflects any origin) | **Medium** |
| 7 | Weak/default secrets accepted from environment (`JWT_SECRET` placeholder) | **Medium** |
| 8 | Broken review authorization (type mismatch ⇒ ownership check never works as intended) | **Medium** |
| 9 | User enumeration via response timing on sign-in | **Low** |
| 10 | Google OAuth account linking does not check `email_verified` | **Low** |
| 11 | Runtime crash (DoS) in `editService` — undefined variables | **Low** |
| 12 | Verbose error/stack exposure tied to fragile `NODE_ENV` string | **Low / Info** |
| 13 | Stale `role` claim baked into JWT | **Info** |

---

## 1. No CSRF protection on cookie-authenticated endpoints — **High**

**Where:** `controllers/auth.controller.js` (`setTokenCookie`), all routers.

The session is a cookie (`lt`, `httpOnly`). Authentication is implicit: the
browser attaches the cookie automatically on every request to the API. In
production the cookie is set with `sameSite: "None"`
(`auth.controller.js:77`), which **disables the browser's built-in
cross-site protection**. There is no anti-CSRF token and no requirement for a
custom header.

**Impact:** A logged-in victim who visits an attacker page can be made to
perform state-changing actions without their knowledge:
- `POST /api/v1/booking` (create bookings),
- `POST /api/v1/review/service/:id` (post reviews),
- and — most seriously — if the victim is an admin, the attacker can forge
  `POST /api/v1/auth/users` to **create a new admin account**, or
  `DELETE /api/v1/auth/users/:id`, `DELETE /api/v1/service/:id`, etc.
  This is a privilege-escalation / full-compromise path.

**Fix:**
- Add CSRF defense for cookie-based auth: either the double-submit token pattern
  (e.g. `csrf-csrf`) or require a custom header (e.g. `X-Requested-With`) that
  cross-site forms cannot set, combined with strict CORS.
- Prefer `SameSite=Lax` (or `Strict`) wherever the deployment allows it; only
  use `None` if the frontend is genuinely on a different site, and then pair it
  with CSRF tokens.

---

## 2. No rate limiting anywhere — **High**

**Where:** `app.js` (no limiter middleware); confirmed no `express-rate-limit`
in `package.json`.

No endpoint is throttled. This exposes:
- **Credential stuffing / brute force** on `POST /api/v1/auth/signin`.
- **Email bombing / resource abuse** on `POST /api/v1/auth/resend-verification`
  and `POST /api/v1/auth/signup` — each triggers an outbound email; an attacker
  can flood a victim's inbox and burn the mail provider quota/reputation.
- **Review/booking spam** on the authenticated write endpoints.

**Fix:** Add `express-rate-limit` globally and stricter per-route limits on
auth and email-sending endpoints (e.g. signin, signup, resend-verification).
Consider exponential backoff / account-level throttling on failed logins.

---

## 3. Auth cookie not `Secure`/`SameSite=None` under standard production env — **High**

**Where:** `auth.controller.js:67,77-79`, `:165-166`; `error.controller.js:61`.

The "is production" check is `process.env.NODE_ENV === "prod"`. The conventional
value set by hosting platforms is `NODE_ENV=production`, not `"prod"`. If the
operator uses the standard value:
- `secure` becomes `false` → the auth cookie is sent over **plain HTTP** and can
  be captured by a network MITM.
- `sameSite` falls back to `"Lax"` instead of `"None"`.
- The global error handler also won't take the production branch, so it will
  fall through to **dev mode behavior is keyed on `=== "dev"`** — meaning
  full stack traces are only sent when `NODE_ENV==="dev"`, but the cookie
  security silently degrades for any value that isn't exactly `"prod"`.

This is a fragile, easy-to-misconfigure security control.

**Fix:** Standardize on `NODE_ENV=production`/`development`. Treat
"secure" as `NODE_ENV !== "development"` (fail-secure), or drive cookie flags
from an explicit boolean env var. Always set `secure: true` in any
internet-facing deployment.

---

## 4. NoSQL injection on unvalidated admin endpoints — **Medium**

**Where:** `routers/auth.router.js:37-38` (`POST /users`, `PATCH /users/:id`)
→ `controllers/auth.controller.js` `createUser` / `updateUser`.

These admin routes have **no Zod `validate()` middleware** (unlike signup/signin).
The body is passed straight into queries:

```js
const existing = await User.findOne({ $or: [{ email }, { phone }] }) // createUser
await User.findOne({ email, _id: { $ne: id } })                      // updateUser
```

Because `express.json()` parses arbitrary JSON, an attacker controlling the body
can pass operator objects, e.g. `email: { "$ne": null }` or `{ "$gt": "" }`,
turning the lookups into injection queries (uniqueness bypass, unintended
matches). It is gated behind `restrictTo("admin")`, which lowers severity, but
the pattern is unsafe and inconsistent with the rest of the codebase.

**Fix:** Add Zod validation schemas for both admin user endpoints (mirroring
`signupSchema`), with `.strict()`. Optionally add `express-mongo-sanitize`
globally as defense in depth so no `$`/`.` keys ever reach a query.

---

## 5. No security headers — **Medium**

**Where:** `app.js` (no `helmet`).

The API sends no `X-Content-Type-Options`, `X-Frame-Options`/CSP,
`Strict-Transport-Security`, `Referrer-Policy`, etc. While this is a JSON API,
some responses (verification redirects, error bodies) and any misrouted HTML
benefit from hardened headers, and HSTS matters once HTTPS is in use.

**Fix:** `app.use(helmet())` and configure HSTS for production.

---

## 6. CORS reflects any origin when `CLIENT_URL` is unset — **Medium**

**Where:** `app.js:36-39`.

```js
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
```

If `CLIENT_URL` is undefined/empty, the `cors` package treats `origin` as
falsy and **reflects the request's `Origin`** (effectively allow-all) — combined
with `credentials: true`, that would let any site make authenticated
cross-origin requests. A single misconfiguration becomes a serious exposure.

**Fix:** Validate that `CLIENT_URL` is set at startup (fail fast if missing).
Use an explicit allow-list of origins and reject unknown origins rather than
relying on a single env value.

---

## 7. Weak/default secrets accepted from environment — **Medium**

**Where:** `.env.example:9` (`JWT_SECRET=change-me-to-a-long-random-string`),
used in `auth.controller.js:50` and `protect.middleware.js:22`.

There is no startup assertion that `JWT_SECRET` is present and sufficiently
strong. If the placeholder (or a short value) is deployed, JWTs can be forged,
allowing full authentication bypass and admin impersonation (the token carries
`role`).

**Fix:** On boot, assert all critical secrets exist and meet a minimum length
(e.g. ≥ 32 bytes of entropy for `JWT_SECRET`); refuse to start otherwise. Never
ship a usable default.

---

## 8. Broken review authorization (type mismatch) — **Medium**

**Where:** `controllers/review.controller.js:14-32`, `models/review.model.js:4-7`.

`review.model.js` declares `service_id` as a **Number**, but services are
Mongoose `ObjectId`s everywhere else (`booking.model.js`, `service.model.js`).
In `createReview`:

```js
const parsedServiceId = Number(serviceId);            // ObjectId hex → NaN
if (isNaN(parsedServiceId)) return next(...400...);   // rejects real services
...
const hasBooked = await Booking.findOne({ user: userId, serviceId: parsedServiceId });
```

`Booking.serviceId` is an ObjectId; comparing it to a Number (or `NaN`) means the
"has this user actually booked the service" check does not function as intended.
The same numeric assumption flows into `getServiceReviews`. The net effect is a
**broken trust boundary**: the eligibility/ownership gate for posting reviews is
built on a type that can never match real data, so the control is unreliable and
the data model is internally inconsistent.

**Fix:** Make `service_id` an `ObjectId` ref to `Service`, validate it with
`mongoose.Types.ObjectId.isValid`, and compare ObjectIds consistently. Re-test
that the "must have booked" check actually passes/fails correctly.

---

## 9. User enumeration via sign-in timing — **Low**

**Where:** `auth.controller.js:145`.

```js
if (!user || !(await user.comparePassword(password))) { ... }
```

The generic error message is good, but the **short-circuit** means bcrypt only
runs when the email exists. The measurable timing difference (no hash vs. a
~12-round bcrypt) lets an attacker enumerate registered emails.

**Fix:** Always perform a constant-work comparison — e.g. compare against a
dummy bcrypt hash when the user is not found — so both branches take similar
time.

---

## 10. Google OAuth linking doesn't verify `email_verified` — **Low**

**Where:** `config/passport.config.js:24-39`.

The strategy links/creates accounts by `profile.emails[0].value` without
checking the profile's `email_verified` flag. If a Google account with an
unverified email is ever accepted, it could be linked to / take over a local
account sharing that address.

**Fix:** Only trust `profile._json.email_verified === true` before linking by
email; otherwise require explicit verification.

---

## 11. Runtime crash (DoS) in `editService` — **Low**

**Where:** `controllers/service.controller.js:185-217`.

The handler destructures only
`{ name, description, pricePerHour, enabled, allCities, cities, allSpecialRequests, specialRequests }`
but then references `subtitle`, `image`, and `includes`
(`:210,212,213`). These are undefined identifiers → **`ReferenceError`** on every
edit, which `catchAsync` turns into a 500. Beyond being a functional bug, an
unhandled programming error path is a reliability/availability concern.

**Fix:** Destructure `subtitle`, `image`, `includes` from `req.body` (they are
already permitted by `editServiceSchema`).

---

## 12. Verbose errors keyed on fragile `NODE_ENV` string — **Low / Info**

**Where:** `controllers/error.controller.js:27-36,61`.

Dev mode returns the full error object and stack
(`sendErrorDev`). It is correctly gated behind `NODE_ENV === "dev"`, so standard
production values won't leak stacks — but see issue #3: the inconsistent `"dev"`
/`"prod"` convention makes the whole environment gating error-prone. A wrong env
value can change security behavior silently.

**Fix:** Centralize a single `isProduction` helper and use it for both error
verbosity and cookie flags.

---

## 13. Stale `role` claim in JWT — **Info**

**Where:** `auth.controller.js:50`.

The JWT embeds `role`, but `protect` re-loads the user from the DB and authorizes
on `req.user.role` (good — role changes take effect immediately). The token's
`role` claim is therefore unused for authz and can go stale; keeping it invites
future misuse if someone later trusts the claim directly.

**Fix:** Either drop `role` from the token, or document that it must never be
used for authorization (DB role is authoritative).

---

## Positive notes (already done well)

- Passwords hashed with bcrypt (cost 12); `password` is `select:false`.
- Email-verification tokens are stored as SHA-256 hashes, not raw.
- Write controllers **whitelist** fields (no `req.body` spreading) — mass
  assignment of `user`/`status`/`role`/payment fields is prevented on bookings.
- Booking confirmation email escapes user-supplied values (`escapeHtml`).
- Body size capped (`express.json({ limit: '4mb' })`).
- `.env` is git-ignored and not tracked; only `.env.example` is committed.
- Most public/admin boundaries are enforced via `protect` + `restrictTo("admin")`.
- Generic auth messages reduce (text-based) user enumeration.

---

## Recommended remediation order

1. CSRF protection + correct `SameSite`/`Secure` cookie flags (#1, #3).
2. Rate limiting on auth and email-sending endpoints (#2).
3. Validate the admin user endpoints + add mongo-sanitize (#4).
4. Startup secret/ env assertions and CORS allow-list (#6, #7).
5. `helmet` (#5).
6. Fix the review type mismatch and `editService` crash (#8, #11).
7. Constant-time login, OAuth `email_verified`, JWT cleanup (#9, #10, #13).
