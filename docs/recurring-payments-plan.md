# Recurring Bookings + Auto-Charge (Subscriptions)

## Context

CasaClean currently only supports one-off bookings: a customer pays on-session via a Stripe PaymentIntent (`createBookingIntent` → `PendingBooking` → `promotePendingBooking`). The goal is a **recurring service**: a customer books a cleaning that repeats every N days (e.g. 3 or 5), and after the first booking **no manual action is needed** — the system automatically charges the saved card each cycle and creates the next Booking, with clear visibility of whether each charge succeeded.

What exists already: Stripe customer + saved cards provisioned with `off_session` usage, `defaultPaymentMethodId` on User, signature-verified webhooks with a `StripeEvent` dedup ledger, fail-closed pricing resolvers, and email utils. What's missing: any recurrence concept, any off-session (unattended) charge path, and any background-job infrastructure.

**Confirmed decisions:**
- In-app scheduler (**node-cron**) + Stripe **off-session PaymentIntents** (not Stripe Billing).
- Charge **1 day before** each service date; the cycle's Booking is created only when the charge succeeds.
- On failure: **retry daily up to 3 total attempts**, then **pause** the subscription + email the customer; resumable after fixing the card.
- Charge visibility: **email per charge** (success + failure), **My Subscriptions** in the profile, **admin subscriptions page** with charge history and paused/failed flags.

## Architecture

A `Subscription` document = booking template + charge schedule. First occurrence is paid **on-session** through the existing intent/finalize flow (with forced `setup_future_usage: 'off_session'`, which provisions the SCA mandate); `promotePendingBooking` then creates the Subscription. An **hourly** cron sweep atomically claims due subscriptions (`status: 'active'`, `nextChargeAt <= now`), re-prices each cycle fail-closed, charges off-session with an idempotency key, and creates the Booking directly (no `PendingBooking` — there is no client to confirm). Charge history = Bookings carrying `subscriptionId` + a capped `chargeAttempts` log on the subscription.

---

## Step 1 — Models & date utils

**New `server/models/subscription.model.js`:**
- Refs: `user` (required), `serviceId`, `cityId`.
- Template snapshot (same shape as `PendingBooking.draft` minus date): `customerName/Email/Phone`, `streetName`, `houseNumber`, `propertySize`, `doorbellName`, `bookingTime` ("HH:MM"), `hours`, `cleaners`, `notes`, `specialRequests[]`, `cleaningTools[]`, `supplies[]`.
- `intervalDays` (Number, required — allowed values from a shared constant `[2,3,5,7,14,30]`).
- `status` enum `['active','paused','cancelled']` (default `active`); `pausedReason` enum `['payment-failed','card-removed','service-unavailable','user-request',null]`.
- Schedule: `nextServiceDate` (String "YYYY-MM-DD", same contract as Booking) + `nextChargeAt` (Date = local midnight of nextServiceDate − `CHARGE_LEAD_DAYS`).
- Stripe: `stripeCustomerId` (required), `paymentMethodId` (required), `firstPaymentIntentId` (unique+sparse — idempotency anchor for creation).
- Charge state: `failedAttempts` (default 0), `lastChargeStatus` (`succeeded|failed|null`), `lastChargeAt`, `lastError`, `lastCycleAmount`, `chargeAttempts[]` (capped log, `$push` with `$slice: -20`: `{at, serviceDate, status, paymentIntentId, amount, errorCode, errorMessage}`).
- `processingAt` (Date, default null) — atomic claim lock for the sweep.
- `pausedAt`, `cancelledAt`; timestamps. Indexes: `{user:1, createdAt:-1}`, `{status:1, nextChargeAt:1}`, `{firstPaymentIntentId:1}` unique+sparse.

**Modify `server/models/booking.model.js`:** add `subscriptionId` (ObjectId ref Subscription, absent-not-null like `paymentIntentId`) + index `{subscriptionId:1, createdAt:-1}`.

**Modify `server/models/pendingBooking.model.js`:** add `recurrence: { intervalDays: Number, default null }` next to `savePaymentMethod`.

**New `server/utils/date.util.js`:** `addDaysToDateString(dateStr, n)`, `localMidnight(dateStr)`, `todayString()` — all using **local** `new Date(y, m-1, d)` construction (mirror `cancelMyBooking`/`isTodayOrFuture`; never `new Date("YYYY-MM-DD")`). Export `ALLOWED_INTERVAL_DAYS`.

**Modify `server/app.js`:** add `Subscription.syncIndexes()` to the startup `Promise.all` ([app.js:183](server/app.js#L183)).

## Step 2 — First cycle: extend the on-session flow

**Modify `server/validations/payment.validation.js`:** extend `bookingIntentSchema` (`.strict()` retained) with optional `intervalDays` restricted to `ALLOWED_INTERVAL_DAYS`.

**Modify `server/controllers/payment.controller.js`:**
- `createBookingIntent`: if `intervalDays` present, require `savedPaymentMethodId || savePaymentMethod` (else 400 AppError "A recurring booking requires a saved card."); always set `params.setup_future_usage = 'off_session'` for recurring; add `metadata.recurring/intervalDays`; persist `recurrence` on the PendingBooking.
- `promotePendingBooking` ([payment.controller.js:62](server/controllers/payment.controller.js#L62)): after the successful `Booking.create`, if `pending.recurrence?.intervalDays`, call `createSubscriptionFromFirstBooking({pending, booking, paymentIntent})` — `paymentMethodId` from `paymentIntent.payment_method`, `stripeCustomerId` from `paymentIntent.customer`, `nextServiceDate = bookingDate + intervalDays`, `firstPaymentIntentId` = the intent id (catch 11000 → return existing, idempotent against finalize/webhook races). Backfill `booking.subscriptionId`.

## Step 3 — Off-session charge path

**New `server/services/subscription.service.js`** (plain async functions — cron has no req/res):
- `createSubscriptionFromFirstBooking(...)` — Step 2 helper.
- `priceSubscriptionCycle(subscription)` — reuse `resolveServiceAndCity` / `resolveSpecialRequests` / `resolveCleaningTools` from `booking.service.js` against the snapshotted ids; **re-price every cycle, never trust snapshotted prices**. Any AppError = unpriceable → caller pauses with `'service-unavailable'`. Skip the same-day/past-time booking-window check (slot was fixed at subscribe time; a retry on the service morning must not fail the clock guard).
- `chargeSubscriptionCycle(subscription)` — one claimed doc:
  1. If `nextServiceDate < todayString()` → pause (cycle missed), never book a past date.
  2. Verify the card: `stripe.paymentMethods.retrieve`; missing or wrong customer → pause `'card-removed'` + email.
  3. Price (catch → pause `'service-unavailable'` + email).
  4. `stripe.paymentIntents.create({ amount: toMinorUnits(total), currency:'eur', customer, payment_method, off_session:true, confirm:true, receipt_email, metadata:{type:'subscription-cycle', subscriptionId, serviceDate, userId} }, { idempotencyKey: `subcycle:${id}:${serviceDate}:a${failedAttempts}` })` — the attempt counter **must** be in the key (Stripe replays the original failed response for a reused key).
  5. Success → `createBookingFromSubscription(...)`: direct `Booking.create` mirroring `promotePendingBooking`'s field list (`status:'confirmed'`, `paymentStatus:'paid'`, `paymentIntentId`, `amountPaid`, `paidAt`, `stripeStatus`, `subscriptionId`, `bookingDate = nextServiceDate`; catch 11000 = already created). Then one atomic subscription update: advance `nextServiceDate` (+intervalDays), recompute `nextChargeAt`, reset `failedAttempts`, set `lastChargeStatus:'succeeded'`/`lastChargeAt`/`lastCycleAmount`, push `chargeAttempts`, clear `processingAt`. Best-effort receipt email.
  6. Failure: `err.type === 'StripeCardError'` (includes `code === 'authentication_required'` — off-session 3DS is impossible, treat as decline) → `handleChargeFailure`. Non-Stripe errors: log, clear `processingAt`, leave `nextChargeAt` so next sweep retries.
- `handleChargeFailure(subscription, err)`: attempt ≥ `SUBSCRIPTION_MAX_ATTEMPTS` (3) → pause `'payment-failed'` + paused email; else `failedAttempts++`, `nextChargeAt = now + 24h`, failure email ("we'll retry tomorrow — update your card at `${CLIENT_URL}/profile`"). Both clear `processingAt` in the same update.
- `ensureSubscriptionCycleBooking(pi)` — webhook backstop (Step 5).
- Email renderers (reuse `escapeHtml`/`formatEuro` idiom from `booking.service.js`): charge-failed, paused, cancelled; success receipt reuses `renderBookingConfirmationEmail` (+ optional recurring line).

## Step 4 — Scheduler

**`server/package.json`:** add `node-cron`.

**New `server/jobs/subscriptionCharge.job.js`:** exported `runSubscriptionCharges()` — claim loop:
```js
const sub = await Subscription.findOneAndUpdate(
  { status:'active', nextChargeAt:{ $lte: new Date() },
    $or:[{processingAt:null},{processingAt:{$lt: new Date(Date.now() - STALE_LOCK_MS)}}] },
  { $set:{ processingAt: new Date() } }, { new:true });
```
one doc at a time until none match; `chargeSubscriptionCycle` never throws out (own try/catch clears the lock). Module-level `running` flag skips overlapping ticks. Claim + attempt-scoped idempotency key ⇒ no double charge even multi-instance.

**New `server/jobs/index.js`:** `startJobs()` = `cron.schedule(process.env.SUBSCRIPTION_CRON || '15 * * * *', ...)` (**hourly**, not daily — a deploy at a daily tick would skip a whole day; hourly + `nextChargeAt <= now` self-heals); `stopJobs()`.

**Modify `server/app.js`:** `startJobs()` inside `start()` after `app.listen` (only when run directly — `server/tests/` requiring `app` must never start cron); `stopJobs()` first in `shutdown()` ([app.js:200](server/app.js#L200)).

## Step 5 — Webhook coverage

**Modify `server/controllers/webhook.controller.js`:**
- `payment_intent.succeeded`: branch on `pi.metadata?.type === 'subscription-cycle'` → `ensureSubscriptionCycleBooking(pi)` (backstop: if no Booking with that `paymentIntentId`, create it + advance the schedule; idempotent via unique index). Else fall through to `promotePendingBooking` as today.
- `payment_intent.payment_failed`: early-return for `subscription-cycle` intents (failure handling is synchronous in the job; the existing "you have not been charged, book again" email is wrong copy for a subscriber).
- `charge.refunded`: unchanged (keys on `paymentIntentId`, works for cycle bookings).

## Step 6 — Subscription API slice (project MVC convention)

**New `server/validations/subscription.validation.js`:** `updateSubscriptionCardSchema = z.object({ paymentMethodId: z.string().trim().min(1) }).strict()` (pause/resume/cancel take no body).

**New `server/controllers/subscription.controller.js`** (all `catchAsync`; ownership in the query `{_id, user: req.user._id}` like `cancelMyBooking`):
- `getMySubscriptions` (GET `/my`) — populate service/city names; envelope with `subscriptionCount`.
- `pauseMySubscription` (PATCH `/:id/pause`) — active→paused, `pausedReason:'user-request'`.
- `resumeMySubscription` (PATCH `/:id/resume`) — verify stored card still resolves & belongs to the customer (fail-closed 400 "update your card first"); reset failure state; if `nextServiceDate` past, roll forward from today + recompute `nextChargeAt`.
- `cancelMySubscription` (PATCH `/:id/cancel`) — cancel + `cancelledAt`; **does not touch already-created paid bookings** (user cancels those individually via existing `cancelMyBooking`); best-effort email.
- `updateMySubscriptionCard` (PATCH `/:id/payment-method`) — same pm-ownership guard as `setDefaultPaymentMethod`.
- Admin: `getSubscriptions` (GET `/`, `?status=&page=&limit=` like `getBookings`), `getSubscriptionById` (GET `/:id` — includes charge history: `Booking.find({subscriptionId})` + `chargeAttempts`), `adminPauseSubscription`/`adminCancelSubscription` (PATCH `/:id/admin-pause|admin-cancel`).

**New `server/routers/subscription.router.js`** (literal before dynamic; `restrictTo('admin')` after `protect`; `paymentLimiter` on the payment-method route). **Mount in `app.js`:** `/api/v1/subscription`.

## Step 7 — Client: booking wizard

- `client/src/features/booking/constants.js`: `RECURRENCE_OPTIONS` (0 = one-time, then 3/5/7/14/30 — labels via i18n); add `intervalDays` to the schedule step's fields.
- `validation/bookingSchema.js`: `intervalDays: z.coerce.number().int().default(0)` + default.
- `components/steps/ScheduleStep.jsx`: frequency selector reusing the existing `OptionGroup` primitive + hint "We'll charge your saved card 1 day before each visit."
- `api/bookingApi.js` `toBookingPayload`: include `intervalDays` only when > 0 (strict server schema).
- `components/steps/PaymentStep.jsx`: `isRecurring = intervalDays > 0`; when recurring with a new card, force+lock the save-card checkbox and always send `savePaymentMethod:true`; show "€X every N days, next charge on <date−1>".
- `ReviewStep.jsx`/`ConfirmationStep.jsx`: surface the recurrence.

## Step 8 — Client: My Subscriptions (profile)

- **New `client/src/features/booking/api/subscriptionApi.js`** — `listMySubscriptions`, `pauseSubscription`, `resumeSubscription`, `cancelSubscription`, `updateSubscriptionCard` via shared `request()`.
- **New `client/src/features/booking/components/MySubscriptions.jsx`** — Card next to `SavedCards.jsx`: per-subscription service/city, "Every N days", next service + next charge dates, **last-charge badge** (succeeded/failed with `lastError`), status badge, paused-for-payment banner linking to SavedCards + Resume, Cancel via existing Modal confirm; react-query key `["my-subscriptions"]`.
- Render in the profile page above `SavedCards`; export from the feature index.

## Step 9 — Client: Admin panel

- `constants/routes.js` + `app/router/routeConfig.js`: lazy `AdminSubscriptionsPage` at `/admin/subscriptions`.
- `features/admin/constants.js`: nav entry + `SUBSCRIPTION_STATUS_META` (active/paused/cancelled) matching `BOOKING_STATUS_META` style.
- `features/admin/api/adminApi.js`: `subscriptionApi = {list, get, pause, resume, cancel}` + `subscriptionFromApi` snake_case normalizer (existing pattern).
- **New `client/src/pages/Admin/SubscriptionsPage.jsx`**: DataTable (customer, service, interval, next charge, last charge, status/flags) + detail Modal with charge history (cycle bookings + failed `chargeAttempts`) and pause/resume/cancel actions.

## Step 10 — i18n & emails

- Add key groups to `client/src/i18n/locales/en.js` and translate in the other locales (project convention): `booking.schedule.repeat.*`, `booking.payment.recurring.*`, `profile.subscriptions.*`, `admin.subscriptions.*` + nav.
- Emails (Step 3 renderers, all best-effort): per-cycle receipt, charge-failed (attempt X of 3 + card-update link), paused, cancellation confirmation.

## Step 11 — Ops, edge cases, docs

- `server/.env.example`: optional `SUBSCRIPTION_CRON` (default `15 * * * *`), `SUBSCRIPTION_MAX_ATTEMPTS` (3), `CHARGE_LEAD_DAYS` (1) — defaulted, **not** added to `assertEnv`.
- **Card deletion guard**: in `deletePaymentMethod`, block (400) if an active/paused subscription uses that pm — tell the user to switch the subscription's card first; the sweep's pm-verification is the backstop for cards detached via Stripe directly.
- **Account deletion**: cancel the user's active subscriptions in the auth delete flow.
- Known client/server `cleaners`-multiplier pricing discrepancy: **not fixed here** (note in code comment only).
- `api-testing/`: new subscription markdown plan + Postman requests. `CLAUDE.md`: add `/api/v1/subscription` to the router list + a "Background jobs" note.

## Verification

1. **Happy path**: book with `4242 4242 4242 4242`, interval 3 → Booking + Subscription created (`nextServiceDate = date+3`, `nextChargeAt = date+2` local midnight); wizard forces save-card.
2. **Fast-forward a cycle**: `db.subscriptions.updateOne({_id},{$set:{nextChargeAt:new Date()}})`, then run `runSubscriptionCharges()` directly via a one-liner node script (why it's exported) → new paid Booking with `subscriptionId`, schedule advanced, receipt email, `chargeAttempts` entry.
3. **Idempotency**: run the sweep twice back-to-back → exactly one PaymentIntent (Stripe dashboard) and one Booking.
4. **`authentication_required`**: subscribe with `4000 0025 0000 3155` (first charge completes 3DS on-session); fast-forward → off-session throws `StripeCardError authentication_required` → retry ladder → paused after 3, paused email, admin flag; update card + resume → next cycle succeeds.
5. **Decline retry**: card `4000 0000 0000 9995` → same ladder.
6. **Webhook backstop**: `stripe listen --forward-to localhost:<PORT>/webhooks/stripe` — cycle `payment_intent.succeeded` creates the booking if the job-side create is disabled; cycle `payment_intent.payment_failed` does NOT send the "book again" email.
7. **API**: Postman — user routes 404 on another user's id; resume rolls stale dates forward; cancel leaves paid bookings intact.
8. **Boot/shutdown/tests**: `node app.js` starts cron; Ctrl-C stops cron before Mongo close; `server/tests/` suites pass with no cron side effects on require; `cd client && npm run lint`.
