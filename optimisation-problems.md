# Server Optimisation Problems — CasaClean

Audit scope: `server/` (Express 5 + Mongoose 9 + MongoDB). Findings are ordered by
impact. Each entry has the location, why it hurts, and the recommended fix.

---

## CRITICAL

### 1. Base64 service images stored in MongoDB and returned on every list request

**Where:** `server/models/service.model.js` (`image: String`),
`server/validations/service.validation.js` (`image: z.string().max(3_000_000)`),
`server/controllers/service.controller.js` → `getServices`

**Problem:** A service image is stored as an inline data URL of up to **3 MB of
base64 text inside the document itself**. `GET /api/v1/service` returns full
documents — with `limit=100` a single response can be **~300 MB of JSON**. Every
page load of the marketing site pulls all of that through MongoDB → driver →
Node heap → JSON serialisation → network, with zero browser/CDN caching (the
image is embedded in an API response, not a cacheable URL). It also bloats
MongoDB's working set / WiredTiger cache, slowing every other query, and base64
itself adds ~33% size overhead.

**Fix (in order of preference):**
1. Store images in object storage (S3 / Cloudinary / Supabase Storage) and keep
   only the URL in the document. Images then get CDN + browser caching for free.
2. If inline storage must stay for now, **exclude the image from list queries**
   and fetch it lazily:
   ```js
   // getServices — never ship megabytes in a list
   Service.find().select("-image").populate(...)
   ```
   and serve the image from a dedicated endpoint (`GET /service/:id/image`) with
   `Cache-Control` headers, or only include it in `getServiceById`.

---

### 2. The 4 MB JSON body limit applies to every route

**Where:** `server/app.js:47` — `app.use(express.json({ limit: '4mb' }))`

**Problem:** The big limit exists only so the admin can upload a service image,
but it is mounted globally. Every endpoint — signin, reviews, bookings — now
accepts a 4 MB body that `express.json` buffers fully in memory and parses with
`JSON.parse` (a CPU-blocking operation on the event loop). 50 concurrent 4 MB
posts ≈ 200 MB of buffers plus event-loop stalls from parsing.

**Fix:** Small default, big limit only where needed:
```js
app.use(express.json({ limit: '100kb' }));                       // global default
app.use('/api/v1/service', express.json({ limit: '4mb' }), serviceRouter); // admin uploads only
```
(Once images move to object storage per finding #1, the 4 MB limit can be
deleted entirely.)

---

### 3. `getAllUsers` loads the entire users collection with no pagination or projection

**Where:** `server/controllers/auth.controller.js:190`
```js
const users = await User.find().sort({ createdAt: -1 }).lean();
```

**Problem:** Unbounded. Memory and response time grow linearly with the user
base; with tens of thousands of users this single admin page can stall the
event loop serialising the response and evict everything else from the DB
cache. It also ships fields the admin table never shows (e.g. `avatar`,
`googleId`).

**Fix:** Use the same paginate pattern the other list controllers already use,
plus a projection:
```js
const page  = Math.max(1, Number(req.query.page) || 1);
const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

const [users, userCount] = await Promise.all([
    User.find()
        .select("fullname email phone role isVerified provider createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    User.estimatedDocumentCount()
]);
```

---

### 4. Emails are sent synchronously inside the request, on a non-pooled SMTP transport

**Where:** `server/controllers/auth.controller.js` (`signup`,
`resendVerificationEmail`), `server/controllers/booking.controller.js:391`
(`createBooking`), `server/utils/email.util.js`

**Problem (two parts):**
1. **Latency.** `signup` and `createBooking` `await sendEmail(...)` before
   responding. An SMTP round-trip is typically 1–5 s (and up to the socket
   timeout when the mail host is slow), so the user stares at a spinner for the
   whole SMTP conversation even though the booking is *already saved*. Worse,
   each in-flight request holds its connection open, eating server concurrency.
2. **Connection churn.** `nodemailer.createTransport` is created without
   `pool: true`, so **every email opens a fresh TCP + TLS + AUTH handshake** to
   the mail server instead of reusing a warm connection.

**Fix:**
- Enable pooling:
  ```js
  transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      pool: true,            // reuse connections
      maxConnections: 5,
      auth: { ... }
  });
  ```
- In `createBooking` the email is already best-effort (failure only logs), so
  stop awaiting it — respond first, send after:
  ```js
  res.status(201).json({ ... });
  sendEmail({ ... }).catch(err => console.error('Email send error:', err.message));
  ```
- For `signup` the rollback-on-failure logic needs the result, so either keep
  the await (acceptable) or move verification email delivery to a small job
  queue (BullMQ / Agenda) with retries — the proper fix at scale.

---

### 5. `PATCH /api/v1/service/:id` crashes with a ReferenceError (every edit → 500)

**Where:** `server/controllers/service.controller.js:187` vs lines 210–217

**Problem:** Not a slowdown — a breakage found while tracing the hot paths, so
it's recorded here. The destructuring pulls
`{ name, description, pricePerHour, enabled, allCities, cities, allSpecialRequests, specialRequests }`
but the code below reads **`subtitle`, `image` and `includes`**, which were
never declared:
```js
if (subtitle !== undefined) service.subtitle = subtitle;   // ReferenceError
```
Every service edit throws, gets reported to Sentry as an unknown error, and
returns 500.

**Fix:** Add the three fields to the destructuring:
```js
const { name, subtitle, description, image, includes, pricePerHour,
        enabled, allCities, cities, allSpecialRequests, specialRequests } = req.body;
```

---

## HIGH

### 6. Unbounded/unsanitised pagination in `getServiceReviews`

**Where:** `server/controllers/review.controller.js:54-57`
```js
const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;
const skip = (page - 1) * limit;
```

**Problem:** Unlike every other list controller, `limit` is not clamped —
`?limit=10000000` returns the whole collection in one response, and a negative
`page`/`limit` produces a negative `skip`, which makes MongoDB throw (500). This
is a public, unauthenticated endpoint, so it is a trivially scriptable
memory/bandwidth amplifier.

**Fix:** Reuse the bounded pattern used everywhere else:
```js
const page  = Math.max(1, Number(req.query.page) || 1);
const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
```

### 7. Review/booking `service_id` type mismatch defeats the booked-check query

**Where:** `server/models/review.model.js:4` (`service_id: Number`),
`server/controllers/review.controller.js:14` (`Number(serviceId)`)

**Problem:** Services are ObjectIds, but reviews key on a **Number** and the
controller does `Number(serviceId)` — which is `NaN` for any real service id,
so `createReview` always 400s, and the `hasBooked` lookup queries the ObjectId
field `Booking.serviceId` with a number (cast error / no match). Beyond being
broken, the eventual fix determines the indexes: the `hasBooked` query
`{ user, serviceId }` currently leans on the `{ user: 1, createdAt: -1 }`
prefix and scans all of a user's bookings.

**Fix:** Change `service_id` to `ObjectId ref: 'Service'`, validate with
`mongoose.Types.ObjectId.isValid(serviceId)` instead of `Number()`, and add a
compound index to back the booked-check exactly:
```js
bookingSchema.index({ user: 1, serviceId: 1 });
```
Also add `reviewSchema.index({ service_id: 1, createdAt: -1 })` so the public
review list (filter + sort) is fully index-backed — the existing unique
`{ service_id, user }` index covers the filter but not the sort.

### 8. No response compression and no HTTP caching on public catalogue endpoints

**Where:** `server/app.js` (no `compression`), all public GETs
(`/service`, `/city`, `/special-request`, `/review/service/:id`)

**Problem:** Catalogue JSON is highly compressible (typically 5–10× with gzip)
and changes rarely, yet every page load re-downloads it uncompressed and the
server recomputes the same queries. Express's default ETag helps only after the
body is fully built — all DB and serialisation cost is still paid per request.

**Fix:**
```js
const compression = require('compression');
app.use(compression());
```
and add short-lived caching to the public reads, e.g.
`res.set('Cache-Control', 'public, max-age=60')` on `getServices`/`getCities`/
`getSpecialRequests` (or cache at a reverse proxy/CDN). Even 60 s absorbs
traffic spikes on the most-hit endpoints. If you stay with inline images
(finding #1), compression is *especially* important — base64 compresses poorly
but still ~25%.

### 9. No rate limiting in front of bcrypt-heavy auth endpoints

**Where:** `server/app.js`, `POST /auth/signin`, `POST /auth/signup`,
`POST /auth/resend-verification`

**Problem:** `bcrypt.hash`/`compare` at cost 12 takes ~200–300 ms of CPU per
call. bcrypt runs on the libuv threadpool (default **4 threads**), so ~16–20
unauthenticated signin attempts per second saturate the pool and stall every
other threadpool consumer (DNS lookups, crypto). One cheap script makes the
whole API crawl. `resend-verification` additionally triggers an SMTP send per
request.

**Fix:**
```js
const rateLimit = require('express-rate-limit');
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));
```
Optionally raise `UV_THREADPOOL_SIZE` (e.g. 8–16) to match expected auth
concurrency.

### 10. Per-request DB lookup in `protect` fetches the full user document

**Where:** `server/middlewares/protect.middleware.js:27`

**Problem:** Every authenticated request does `User.findById(payload.id)`. The
DB hit itself is a deliberate trade-off (it makes deleted users lose access
immediately) — but it fetches **every field** when downstream code only ever
reads `_id`, `role`, and the profile trio used by bookings.

**Fix:** Project just what's used; this keeps the lookup a covered/cheap point
read and shrinks per-request allocation:
```js
const user = await User.findById(payload.id)
    .select("fullname email phone role isVerified")
    .lean();
```
If auth-read load ever becomes a problem, add a short in-process TTL cache
(30–60 s) keyed by user id — accepting that revocation lags by the TTL.

---

## MEDIUM

### 11. Sequential independent queries that should run in parallel

**Where:**
- `service.controller.js` `createService`: duplicate-name check →
  `resolveCoverage` → `resolveSpecialRequest` run one after another (3 DB
  round-trips serially; all three are independent).
- `auth.controller.js` `updateUser:259-270`: email-uniqueness check and
  phone-uniqueness check are two sequential `findOne`s.

**Problem:** Each `await` adds a full DB round-trip of latency for no reason —
the queries don't depend on each other's results.

**Fix:**
```js
// createService
const [exists, coverage, specialRequest] = await Promise.all([
    Service.findOne({ name: formattedName }).lean(),
    resolveCoverage(allCities, cities),
    resolveSpecialRequest(allSpecialRequests, specialRequests)
]);

// updateUser — one $or query instead of two findOnes
const conflict = await User.findOne({
    _id: { $ne: id },
    $or: [
        ...(email && email !== user.email ? [{ email }] : []),
        ...(phone && phone !== user.phone ? [{ phone }] : [])
    ]
}).select("email phone").lean();
```

### 12. `findOne`-before-`create` duplicate checks duplicate the unique index's work

**Where:** `createService`, `addCity`, `addSpecialRequest`, `signup`,
`createUser` — all do a read to check uniqueness, then write.

**Problem:** Every create pays an extra round-trip, and the check is racy —
two concurrent creates both pass `findOne` and one then fails on the unique
index anyway. The global error handler **already maps E11000 → 409** with a
clean message, so the pre-check buys nothing except a friendlier
field-specific message.

**Fix:** Drop the pre-check and let the unique index + `handleDuplicateFields`
do the job (one round-trip, race-free). Keep the pre-check only where the
message must distinguish email vs phone — and even there a single `$or` query
is the ceiling, never two.

### 13. `countDocuments()` on unfiltered lists instead of `estimatedDocumentCount()`

**Where:** `getBookings`, `getServices`, `getCities`, `getSpecialRequests`

**Problem:** Unfiltered `countDocuments({})` performs an index scan of the
whole collection on every page view. `estimatedDocumentCount()` reads the
collection metadata in O(1).

**Fix:** For the no-filter lists:
```js
Booking.estimatedDocumentCount()
```
Keep `countDocuments(filter)` where there *is* a filter (`getMyBookings`).

### 14. Public `getServices` populates and returns data the marketing page doesn't need

**Where:** `service.controller.js:99-108`

**Problem:** The public list runs **three** queries per request (services +
populate cities + populate specialRequests) and returns disabled services too.
The marketing page only needs enabled services' display fields; the admin panel
is the only consumer of the full shape.

**Fix:** Filter and slim down the public path (or split a `?view=admin` /
separate admin endpoint):
```js
Service.find({ enabled: true })
    .select("name subtitle description includes pricePerHour")  // no image — see #1
    .sort({ createdAt: -1 })
```
Populate `cities`/`specialRequests` only for the admin view that actually
renders them.

### 15. `promisify(jwt.verify)` is recreated on every request

**Where:** `protect.middleware.js:22`

**Problem:** A new promisified wrapper is allocated per authenticated request.
Tiny per call, but it's on the hottest path in the app.

**Fix:** Hoist it once at module load:
```js
const verifyJwt = promisify(jwt.verify);
// ...
const payload = await verifyJwt(token, process.env.JWT_SECRET);
```

---

## LOW

### 16. Skip/limit pagination degrades on deep pages

**Where:** all list controllers

`skip(n)` still walks `n` index entries, so page 1000 costs ~1000× page 1. Not
a problem at current scale; if bookings grow large, switch the admin list to
cursor (keyset) pagination on `createdAt`/`_id`
(`{ createdAt: { $lt: lastSeen } }`).

### 17. Hard-coded public DNS servers for all lookups

**Where:** `server/config/db.config.js:3` — `dns.setServers(['8.8.8.8', '8.8.4.4'])`

This redirects **every** DNS lookup the process makes (SMTP host, Sentry,
Google OAuth) to Google DNS. In a VPC/datacentre this bypasses the local
resolver and its cache, adding latency to each fresh lookup, and breaks if
egress to 8.8.8.8 is filtered. If it exists to work around a local SRV-lookup
issue with `mongodb+srv://`, prefer fixing the host's resolver or using the
non-SRV connection string, and remove this global override.

### 18. `process.exit(1)` on unhandledRejection drops in-flight requests

**Where:** `server/app.js:91-94`

Exiting immediately kills every in-flight request mid-response. Capture the
`app.listen` server handle and close it first (with a short timeout), then
exit:
```js
const server = app.listen(...);
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION 💥 Shutting down...", err);
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 10_000).unref();
});
```

---

## Quick-win checklist (smallest effort → biggest payoff)

| # | Change | Effort | Payoff |
|---|--------|--------|--------|
| 2 | Scope the 4 MB body limit to the service routes | 2 lines | Removes a memory-amplification vector |
| 4 | `pool: true` on nodemailer + stop awaiting booking email | ~5 lines | Booking response drops by SMTP round-trip time |
| 5 | Fix `editService` destructuring | 1 line | Un-breaks service editing |
| 6 | Clamp review pagination | 2 lines | Closes a public unbounded-query hole |
| 8 | `app.use(compression())` | 2 lines | 5–10× smaller catalogue responses |
| 1 | `.select("-image")` on `getServices` | 1 line | Biggest single bandwidth/memory win until images move to object storage |
| 9 | Rate-limit `/auth` | ~5 lines | Protects the bcrypt threadpool |
