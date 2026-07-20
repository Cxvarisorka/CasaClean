# Subscription Endpoints — Test Plan

Subscriptions are recurring-cleaning templates. They are **not** created by a
public `POST /subscription` endpoint: completing the first on-session booking
payment with `intervalDays` creates one automatically.

Base address: `http://localhost:3000/api/v1/subscription`

| Method | Endpoint | Who can use it | What it does |
|---|---|---|---|
| GET | `/my` | Logged-in user | List the caller's subscriptions |
| PATCH | `/:id/pause` | Owner | Pause an active subscription |
| PATCH | `/:id/resume` | Owner | Resume a paused subscription after checking its card |
| PATCH | `/:id/cancel` | Owner | Cancel future cycles only |
| PATCH | `/:id/payment-method` | Owner | Switch to another saved card |
| GET | `/` | Admin | List subscriptions, optionally by status |
| GET | `/:id` | Admin | View a subscription, cycle Bookings, and charge attempts |
| PATCH | `/:id/admin-pause` | Admin | Pause an active subscription |
| PATCH | `/:id/admin-resume` | Admin | Resume a paused subscription |
| PATCH | `/:id/admin-cancel` | Admin | Cancel future cycles |

> All state-changing calls need the normal login cookie and
> `X-Requested-With: XMLHttpRequest`. Pause, resume, and cancel use an empty
> JSON body (`{}`); extra fields are rejected.

## 1. Create a subscription through the first payment

1. Sign in and use the normal booking payment flow with a future `bookingDate`.
2. Send an allowed `intervalDays` (`2`, `3`, `5`, `7`, `14`, or `30`) plus
   either `savePaymentMethod: true` or `savedPaymentMethodId`.
3. Complete the first on-session Stripe confirmation. `4242 4242 4242 4242`
   covers the successful test-card path.
4. Call `GET /my` and save the returned `_id` as `subscriptionId`.

Expected result: one confirmed, paid first Booking with `subscriptionId`, one
active Subscription, `nextServiceDate` equal to the first date plus the
interval, and (with the default lead) `nextChargeAt` at local midnight one day
before that date. A recurring intent without a saved card is **400** with
`A recurring booking requires a saved card.`

## 2. Customer routes

### GET `/my` — list my subscriptions

```bash
curl http://localhost:3000/api/v1/subscription/my -b cookie.txt
```

Expect **200**, `subscriptionCount`, and `data.subscriptions`. Verify only the
caller’s records are returned and service/city names are populated.

### PATCH `/:id/pause` — pause

```bash
curl -X PATCH http://localhost:3000/api/v1/subscription/PASTE_SUBSCRIPTION_ID/pause ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -b cookie.txt ^
  -d "{}"
```

Expect **200**, `status: "paused"`, and `pausedReason: "user-request"`.
Pausing again is **400**; another user’s id is **404**.

### PATCH `/:id/resume` — resume

```bash
curl -X PATCH http://localhost:3000/api/v1/subscription/PASTE_SUBSCRIPTION_ID/resume ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -b cookie.txt ^
  -d "{}"
```

Expect **200** and `status: "active"`. Failure state is reset. A detached or
wrong-owner saved card returns **400** with `Please update your card first.` A
stale service date is rolled forward and gets a newly calculated charge time.

### PATCH `/:id/payment-method` — switch card

```bash
curl -X PATCH http://localhost:3000/api/v1/subscription/PASTE_SUBSCRIPTION_ID/payment-method ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -b cookie.txt ^
  -d "{\"paymentMethodId\":\"pm_PASTE_A_CARD_OWNED_BY_THIS_USER\"}"
```

Expect **200**. A missing card or card owned by another Stripe customer is
**404**; unknown body fields are **400**.

### PATCH `/:id/cancel` — cancel future cycles

```bash
curl -X PATCH http://localhost:3000/api/v1/subscription/PASTE_SUBSCRIPTION_ID/cancel ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -b cookie.txt ^
  -d "{}"
```

Expect **200**, `status: "cancelled"`, and `cancelledAt`. Confirm any already
created, paid cycle Bookings remain unchanged; manage those through the normal
Booking cancellation flow if needed.

## 3. Admin routes

Sign in as an admin before these checks.

### GET `/` — list

```bash
curl "http://localhost:3000/api/v1/subscription?status=paused&page=1&limit=10" -b cookie.txt
```

Expect **200**, `subscriptionCount`, and `data.subscriptions`. Allowed status
filters are `active`, `paused`, and `cancelled`; a non-admin receives **403**.

### GET `/:id` — detail and history

```bash
curl http://localhost:3000/api/v1/subscription/PASTE_SUBSCRIPTION_ID -b cookie.txt
```

Expect **200** with `data.subscription` and `data.bookings`. Verify successful
cycle Bookings and the capped `chargeAttempts` log appear together.

### Admin pause, resume, and cancel

```bash
curl -X PATCH http://localhost:3000/api/v1/subscription/PASTE_SUBSCRIPTION_ID/admin-pause ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -b cookie.txt ^
  -d "{}"
```

Replace `admin-pause` with `admin-resume` or `admin-cancel` for the other
actions. Each successful action returns **200**. Pause requires an active
subscription; resume requires a paused subscription with a valid stored card.

## 4. Charge-worker verification

The cron worker charges one day before the service date. For a controlled test,
fast-forward an active Subscription in MongoDB and call the exported job from
the `server/` directory:

```javascript
db.subscriptions.updateOne(
  { _id: ObjectId("PASTE_SUBSCRIPTION_ID") },
  { $set: { nextChargeAt: new Date() } }
)
```

```bash
node -e "require('dotenv').config(); const mongoose=require('mongoose'); const connectDB=require('./config/db.config'); const {runSubscriptionCharges}=require('./jobs/subscriptionCharge.job'); connectDB().then(runSubscriptionCharges).then(console.log).finally(()=>mongoose.connection.close()).catch(err=>{console.error(err); process.exitCode=1;})"
```

Expect one new confirmed, paid Booking with that `subscriptionId`, an advanced
schedule, `failedAttempts: 0`, a successful charge-attempt entry, and a
best-effort receipt email. Run the sweep twice back-to-back: Stripe and MongoDB
must still show only one PaymentIntent and one Booking for the cycle.

For the retry ladder, use `4000 0025 0000 3155` (off-session authentication
required) or `4000 0000 0000 9995` (decline), fast-forward `nextChargeAt`
before each run, and verify the first two failures retry around 24 hours later.
The third total failure pauses the subscription with
`pausedReason: "payment-failed"`. Update to a valid card and resume to permit a
later cycle to succeed.

Finally, disable the service, city, add-on, or coverage before a due sweep. The
subscription must pause with `service-unavailable`, send a best-effort email,
and make no charge. A card detached directly in Stripe must similarly pause it
with `card-removed` and make no charge.
