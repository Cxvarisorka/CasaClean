# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

CasaClean is a cleaning-service booking platform split into two **independent npm packages** (there is no root `package.json` or workspace tooling — install/run each side separately):

- `server/` — Express 5 + Mongoose 9 REST API (CommonJS). Cookie/JWT auth, Google OAuth, email verification.
- `client/` — React 19 SPA built with Vite (ESM, JavaScript, **no TypeScript**). Marketing site + booking wizard + admin panel.
- `api-testing/` — QA test plan (markdown per resource) and a ready-to-import `CasaClean.postman_collection.json`. The Postman collection auto-captures the `lt` auth cookie and ids between requests; use it to exercise the API end-to-end.

Deep references already exist — read them before large changes instead of re-deriving:
- `client/FRONTEND.md` — exhaustive front-end architecture (provider graph, routing, design system, i18n, SEO, booking wizard). `client/README.md` is the shorter version.
- `api-testing/README.md` + `api-testing/00-setup.md` — endpoint-by-endpoint behavior and the admin-bootstrap procedure.

## Commands

**Server** (`cd server`):
- `npm install`
- `node app.js` — start the API. There is **no `start`/`dev` script** despite what `api-testing/00-setup.md` says (`npm start` will fail with "Missing script: start"). Use `node app.js`, or run nodemon yourself for reload.
- No test runner is configured (`npm test` only prints an error). Verify changes against `api-testing/` manually or via the Postman collection.

**Client** (`cd client`):
- `npm install`
- `npm run dev` — Vite dev server
- `npm run build` / `npm run preview`
- `npm run lint` — ESLint (the only automated check in the repo)
- No test runner is configured.

Both sides need a `.env` (copy from each `.env.example`). The server **refuses to boot** with missing/weak config (see below), so populate `MONGO_URI`, `JWT_SECRET` (≥32 chars, not a placeholder), `JWT_EXPIRES_IN`, `CLIENT_URL`, `SERVER_URL`, `PORT` before starting. To create the first admin: sign up, verify the email, then flip that user's `role` to `"admin"` directly in MongoDB.

## Backend architecture

### Request pipeline (order is load-bearing — see `server/app.js`)
`assertEnv()` (fail-fast on bad config) → `helmet` → CORS allow-list (`CLIENT_URL` only, `credentials:true`) → `globalLimiter` → `passport.initialize()` → `express.json({limit:'4mb'})` + `cookieParser` → `csrfGuard` → `sanitizeMongo` → routers (`/api/v1/{auth,city,service,booking,special-request,review}`) → `/*splat` 404 → Sentry error handler → `globalErrorHandler` (must be last).

### Per-resource MVC layering
Each resource follows the same vertical slice, named by suffix: `routers/x.router.js` → `validations/x.validation.js` (Zod) → `controllers/x.controller.js` → `models/x.model.js`.

- **Routers** wire middleware in order: rate limiter → `protect`/`restrictTo` → `validate(schema)` → controller. `restrictTo("admin")` always comes *after* `protect` (which populates `req.user`). Declare literal routes (e.g. `/my`) before dynamic ones (`/:id`).
- **`validate(schema)`** (`middlewares/validate.middleware.js`) runs `schema.safeParse(req.body)` and **replaces `req.body` with the parsed data**. Zod schemas use `.strict()` so unknown fields are rejected.
- **Controllers** are wrapped in `catchAsync` (any throw/rejection → `next(err)`). They **never spread `req.body`** — every write explicitly whitelists fields to block mass-assignment of server-managed fields (`user`, `role`, `status`, payment ids). Throw `new AppError(message, statusCode, details?)` for operational errors.
- **`globalErrorHandler`** (`controllers/error.controller.js`) is the single response formatter. It normalizes Mongoose `CastError`/`ValidationError`, Mongo `11000` duplicates, and JWT errors into `AppError`s. Verbosity is environment-gated.

### Response envelopes
- Success: `{ status: "success", message, data: { ... } }` (list endpoints add a count field, e.g. `bookingCount`).
- Error: `{ success: false, status, message }` (dev mode also includes `error`, `stack`, `errors`).

### Auth & security model (the distinctive part of this codebase)
- **Session** = httpOnly cookie named `lt` holding a JWT. The JWT payload carries **only the user id, never the role** — `protect` re-loads the user from the DB each request and authorizes on the live `role`, so a token can't carry a stale/forged role.
- **`utils/env.util.js` is the single source of truth for environment posture and is FAIL-SECURE**: `isProduction` is true for *any* `NODE_ENV` that isn't explicitly `dev`/`development`/`test`. Cookie `Secure`/`SameSite=None` flags and error verbosity key off this — an unknown env value gets the safe production behavior. `assertEnv()` aborts startup on missing/short/placeholder secrets.
- **CSRF** (`middlewares/csrf.middleware.js`): every state-changing request (non-GET/HEAD/OPTIONS) must carry `X-Requested-With: XMLHttpRequest`. The client's axios instance sends it automatically; cross-site forms can't set it and cross-origin scripts get blocked by CORS. This is what makes `SameSite=None` cookies safe in production.
- **Anti-enumeration**: signin always runs one bcrypt compare (against a dummy hash when the email is unknown) and returns a single generic message; resend-verification returns an identical response for every case.
- **Email verification**: only the SHA-256 *hash* of the token is stored (`select:false`); the raw token lives only in the emailed link. Verifying auto-logs-in and redirects to `CLIENT_URL`.
- **Rate limiting** (`middlewares/rateLimit.middleware.js`): global backstop plus tighter per-route limits on signin, signup, and email-sending endpoints.
- `sanitizeMongo` strips `$`/`.` operator keys from body & params (defense-in-depth on top of Zod).

### Domain model & fail-closed reference resolution
Mongoose fields are **camelCase**. Core relationships: `Booking` references `User`, `Service`, `City`, and `SpecialRequest[]`. A `Service` is offered in `allCities` or an explicit `cities[]` subset, and accepts `allSpecialRequests` or an explicit `specialRequests[]` subset.

Before creating a booking, `booking.controller.js` calls `resolveServiceAndCity` and `resolveSpecialRequests` — these **fail closed**: ids must be valid ObjectIds pointing to existing, `enabled` documents, the city must be within a city-restricted service's coverage, and add-ons must be offered by that service. Controllers never trust raw ids from the request.

Mongoose 9 note: document `pre('save')` hooks use the **no-arg form** (no `next` callback) — keeping `next` throws "next is not a function".

## Frontend architecture

Full detail is in `client/FRONTEND.md`; the essentials a future change touches:

- **Feature-driven** layout under `client/src/features/<domain>/` (each colocates `api/`, `hooks/`, `validation/`, `components/`). Shared UI primitives live in `components/ui/` (atomic design), composed by thin page orchestrators in `pages/`.
- **Routing** is a single source of truth: path strings in `constants/routes.js`, route table in `app/router/routeConfig.js` (every page is `React.lazy`). Adding a marketing page = one row + a lazy import.
- **API layer** (`services/api/`): a single axios instance (`withCredentials:true`, base from `VITE_API_BASE_URL`). The `request()` helper **unwraps the `{ data: { data } }` envelope** and interceptors normalize errors to `{ status, message, code, fields }`. Features call `request` + `ENDPOINTS` — never raw axios in components.
- **Client↔server contract is camelCase** end-to-end. `features/booking/api/index.js` `toBookingPayload()` maps wizard fields to the camelCase body the API's `.strict()` schema expects. (Note: FRONTEND.md §7.1 describes a snake_case mapping — that is outdated; the code sends camelCase.)
- **Graceful API degradation**: booking/contact submissions simulate success only when the API is genuinely unreachable (`err.status === 0`); real validation errors from a live server still surface.
- **Admin panel** (`features/admin/` + `pages/Admin/`) is auth-guarded via `AdminRoute` and consumes the same auth/booking/city/service/user endpoints. The bookings map needs `VITE_GOOGLE_MAPS_API_KEY` (degrades to a setup notice without it).
