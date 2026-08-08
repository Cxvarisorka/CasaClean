# VAT / business customer tests

Catalogue prices are **VAT-exclusive** — VAT is added on top for whoever owes it,
so a private customer pays the catalogue price plus VAT. A business whose VAT
number has been **verified** has no VAT added (EU reverse charge).

Base address: `http://localhost:3000/api/v1`

## Turning it on

Everything here is off until a rate is configured. In `server/.env`:

```
INVOICE_VAT_RATE=22
```

Restart the server. With no rate, there is no VAT anywhere and no
business/individual distinction at all.

You also need the VAT-verification events on your Stripe webhook endpoint,
alongside the payment ones:

```
customer.tax_id.created
customer.tax_id.updated
customer.tax_id.deleted
```

In dev, `stripe listen --forward-to localhost:3000/webhooks/stripe` already
forwards everything.

## The rule in one table

| Customer | VAT number | Charged for a €120.00 catalogue service |
| --- | --- | --- |
| Private person | — | **€146.40** (net €120.00 + VAT €26.40) |
| Business, no number yet | — | **€146.40** |
| Business, number **pending** | not yet checked | **€146.40** |
| Business, number **unverified** | rejected by VIES | **€146.40** |
| Business, number **verified** | confirmed by VIES | **€120.00** — no VAT added |

Only the last row gets relief. That is deliberate: charging VAT to someone who
turns out to be exempt costs a refund request; *not* charging it to someone who
isn't means owing tax you never collected.

## 1. Register a VAT number

Sign in as a normal customer, then:

```bash
curl -b cookie.txt -X PATCH \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{"customerType":"business","companyName":"Acme Srl","vatNumber":"it 012 345 678-90"}' \
  http://localhost:3000/api/v1/auth/me/tax-profile
```

Expect `200`, and in the response:

- `customerType: "business"`
- `vatNumber: "IT01234567890"` — normalised (uppercase, no spaces or dashes)
- `vatStatus: "pending"` — **not** verified
- a message saying VAT is still charged while it's being checked

In the panel this is **Profile → Billing details**.

## 2. You cannot verify yourself

This is the important one. Try to set the status directly:

```bash
-d '{"customerType":"business","vatNumber":"IT01234567890","vatStatus":"verified"}'
```

Expect `400` (unknown field). `vatStatus` is written **only** from Stripe's
verification result — there is no request shape that can set it, and the pricing
code reads the stored user rather than anything in the request body.

Also try smuggling it into the booking body:

```bash
-d '{"serviceId":"...","cityId":"...","customerType":"business", ...}'
```

Expect `400` from the booking schema too.

## 3. A malformed number is rejected immediately

```bash
-d '{"customerType":"business","vatNumber":"12345"}'
```

Expect `400` with a message about the country prefix, and **no** Stripe call —
the structural check runs first so an obvious typo fails fast.

## 3a. Getting a customer to `verified` without waiting on VIES

Most of the interesting behaviour only starts once a number is **verified**, and
VIES will not verify a number you invented. Two ways to get there:

**Use a real number.** Any genuine, currently-registered EU VAT number verifies.
The Italian tax authority's own number (`IT00950501007`) works, and there are
public registries full of others. Register it, wait for the webhook, done.

**Or set the status directly in MongoDB** — the same shortcut used to create the
first admin. The API deliberately has no way to do this (that is §2), so reach
past it:

```js
// mongosh
db.users.updateOne(
  { email: "you@example.com" },
  { $set: { customerType: "business", companyName: "Acme Srl",
            vatNumber: "IT01234567890", vatStatus: "verified" } }
)
```

No restart needed — pricing re-reads the user on every request. To go back, set
`vatStatus` to `"unverified"` (a rejected number) or `"none"` with an empty
`vatNumber` (no registration at all).

## 4. Verification arriving

VIES answers asynchronously. In dev with `stripe listen` running, wait a few
seconds and re-read the profile:

```bash
curl -b cookie.txt http://localhost:3000/api/v1/auth/me
```

Expect `vatStatus` to become `verified` (a real registered number) or
`unverified` (an invented one). The response also carries a derived `tax` block:

```json
"tax": { "treatment": "reverse-charge", "reverseCharge": true,
         "vatRate": 0, "catalogueVatRate": 22 }
```

That block is what the booking wizard uses to show the right total, so it must
agree with what the payment endpoint charges.

If the webhook never arrives (no tunnel, delivery failure), the customer isn't
stuck — press **Check now** in the profile, or:

```bash
curl -b cookie.txt -X POST \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" -d '{}' \
  http://localhost:3000/api/v1/auth/me/tax-profile/refresh
```

## 5. The charge actually changes

With a **verified** customer, create a payment intent for a €120.00 booking:

```bash
curl -b cookie.txt -X POST \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{ ...booking fields... }' \
  http://localhost:3000/api/v1/payment/booking/intent
```

Expect `data.amount` to be **120**, not 146.40. Confirm in the Stripe dashboard
that the PaymentIntent is for **12000** cents — the relief happens at the charge,
not just on the paperwork.

Then finalize and check the booking:

```json
"totalAmount": 120,
"tax": {
  "treatment": "reverse-charge",
  "vatRate": 0,
  "vatAmount": 0,
  "netAmount": 120,
  "catalogueVatRate": 22,
  "vatNumber": "IT01234567890",
  "companyName": "Acme Srl"
}
```

Repeat as a private customer: `amount` must be **146.40**, `treatment`
`standard`, `netAmount` 120 and `vatAmount` 26.40.

## 6. The wizard shows what it charges

Book through the UI as a verified business. The summary must show:

```
Subtotal (excl. VAT)         €120.00
VAT 22% — reverse charge       €0.00
Estimated total              €120.00
```

plus a note explaining the reverse charge. As a private customer the same block
reads `VAT 22%  €26.40` and a total of **€146.40**. A total that disagrees with the
payment step is a bug — the wizard reads the treatment from `/auth/me`, it does
not decide it.

## 7. Admin bookings follow the customer, not the admin

As an admin, create a booking **on behalf of** a verified business
(`userId` = that customer):

```bash
curl -b admin-cookie.txt -X POST \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<businessId>", ...booking fields... }' \
  http://localhost:3000/api/v1/booking
```

Expect `totalAmount` 120.00 and `treatment` `reverse-charge` — even though the
admin placing it is a private individual and would pay the VAT.

A **walk-in** booking (no `userId`) has no verified number, so expect 146.40 and
`standard`.

## 8. Recurring plans re-check every cycle

The treatment is **not** frozen on the subscription. Each charge re-reads the
customer, so:

- a customer who registers and verifies a number mid-plan stops paying VAT from
  the next cycle;
- a customer whose number is deleted or fails re-verification goes back to
  paying VAT.

Waiting out a real interval is impractical, so force a cycle instead. From
`server/`:

```bash
# What WOULD be charged right now, without touching Stripe:
node scripts/runSubscriptionCycleNow.js <subscriptionId> --dry-run

# Actually charge one cycle now:
node scripts/runSubscriptionCycleNow.js <subscriptionId>
```

Get the `subscriptionId` from `GET /api/v1/subscription/my`, or from the admin
panel. The script pulls `nextChargeAt` into the past and runs the sweep once; it
refuses to run outside a dev environment.

The full loop to prove the re-check:

1. Start a plan as a **private** customer. `--dry-run` → **€146.40**,
   `treatment: "standard"`.
2. Flip the customer to a verified business (§3a). Change nothing on the plan.
3. `--dry-run` again → **€120.00**, `treatment: "reverse-charge"`. No edit to the
   subscription was needed; it re-read the customer.
4. Run it for real. The new cycle booking must have `totalAmount` 120.00 and the
   reverse-charge snapshot, and its invoice must state Article 196.
5. Set `vatStatus` back to `"unverified"`, force another cycle → **€146.40** and
   `standard` again. The already-charged cycle from step 4 must be **unchanged**
   — a completed transaction is never restated.

Deleting the tax id in the Stripe dashboard (or `PATCH /auth/me/tax-profile` with
`customerType: "individual"`) is the realistic version of step 5.

## 9. Switching back to a personal account

```bash
-d '{"customerType":"individual"}'
```

Expect the VAT registration to be **dropped entirely**: `vatNumber` empty,
`vatStatus` `none`, and the tax id detached from the Stripe customer. Leaving a
verified number attached to a personal account would let a customer toggle the
type back and forth to dodge VAT.

Re-saving the **same** number on a business account must **not** reset a
`verified` status back to `pending` — check that editing only the company name
leaves the status alone.

## 10. Existing bookings are never re-taxed

Edit a business booking in the admin panel (change the hours, say). It must be
repriced under **its own** stored treatment, not the customer's current one — a
business that has since let its registration lapse must not have an already-paid
booking silently re-taxed.

Bookings made before VAT was configured have no stored treatment; editing one
must leave its total exactly as it was.

## 11. The invoice

See [invoice/invoice-tests.md](../invoice/invoice-tests.md) §9 for the
reverse-charge invoice: net line items, the €0.00 VAT line, the customer's VAT
number, and the Article 196 notice.

Two things to check on the document itself:

- **It adds up.** Line items are stated net on every invoice, so they sum to the
  `Subtotal (net)` line — which IS the total under the reverse charge, and the
  total minus the VAT for everyone else. Add a special request to the booking and
  confirm: a €12.20 add-on prints as €12.20.
- **The PDF renders.** Download it (`GET /invoice/:id/pdf`) — the reverse-charge
  path draws blocks the standard one never touches, so a PDF that opens is a real
  check, not a formality.

## 12. The short version

If you only have fifteen minutes, this is the whole feature. Set
`INVOICE_VAT_RATE=22` and use a €120.00 catalogue booking throughout.

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Book as a private customer | **€146.40**, `standard`, net 120.00 + VAT 26.40 |
| 2 | Register a VAT number, book before it verifies | **€146.40**, `standard` |
| 3 | Force it to `unverified` (§3a), book | **€146.40** — a rejected number earns nothing |
| 4 | Force it to `verified`, book | **€120.00**, `reverse-charge`, VAT 0 |
| 5 | Check Stripe for that intent | amount **12000** — the relief is on the charge |
| 6 | Switch back to a personal account, book | **€146.40** again |
| 7 | As admin, book on behalf of the verified business | **€120.00** — the customer's status, not the admin's |
| 8 | As admin, book a walk-in (no `userId`) | **€146.40** |
| 9 | Force a recurring cycle (§8) before and after verifying | **€146.40** then **€120.00**, no plan edit |
| 10 | Open the business invoice | net lines summing to 120.00, €0.00 VAT, VAT number, Article 196 |
| 11 | Edit an old business booking's hours in the panel | repriced on **its own** stored treatment |

## What the automated tests already cover

Most of the above is pinned in `server/tests`, so run `npm test` in `server/`
before doing any of it by hand:

- `tests/unit/tax.util.test.js` — the rule itself: fail-closed qualification, VAT
  added on top and reconciling to the cent at every rate, re-applying a stored
  treatment.
- `tests/integration/tax.test.js` — registering a number, the webhook states, the
  price at each of them, admin/walk-in bookings, the invoice and its PDF.
- `tests/integration/taxLifecycle.test.js` — the price following a customer
  **through** every transition: verifying, lapsing, being deleted, being replaced;
  the `/auth/me` block the wizard reads; admin edits re-pricing on the booking's
  own treatment.
- `tests/integration/taxRecurring.test.js` — unattended cycles re-resolving the
  treatment, in both directions, and the invoice each cycle issues.
- `client/src/features/booking/utils/pricing.test.js` — the wizard displaying the
  treatment the server resolved (it never decides one itself).

The one thing tests cannot check for you is Stripe's real VIES round-trip, which
is why §3a and §4 exist.
