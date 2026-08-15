# Invoice tests

Every successful payment issues a numbered invoice and emails it to the customer
with the PDF attached. This file explains how to check that, and how to use the
invoice endpoints from the admin panel.

Base address: `http://localhost:3000/api/v1`

## What an invoice is (and isn't)

An invoice is a **snapshot** of one paid booking, taken at the moment the payment
succeeded. It stores its own copy of the company details, the customer details,
the service name and every priced line. Renaming a service or editing a customer
profile afterwards must **never** change an invoice that has already been sent.

There is **no update endpoint**, on purpose. The only writes are:

- issue the invoice a paid booking is missing, and
- send it by email again.

## The endpoints

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `GET` | `/invoice/my` | signed-in customer | that customer's own invoices |
| `GET` | `/invoice` | admin | all invoices, newest first (paginated) |
| `GET` | `/invoice/:id` | owner or admin | one invoice |
| `GET` | `/invoice/:id/pdf` | owner or admin | downloads the PDF |
| `POST` | `/invoice/:id/send` | admin | emails it again |
| `POST` | `/invoice/booking/:bookingId` | admin | issues the invoice for a paid booking |

## 1. Pay for a booking and check the email

1. Sign in as a normal user.
2. Create a payment intent and finalize it (see
   [booking/booking-tests.md](../booking/booking-tests.md) for the full flow).
3. Open your Mailtrap inbox.

**Expect one email, not two.** Its subject contains the invoice number:

```
CasaClean — Invoice CC-2026-000042 · your booking is confirmed
```

It must have a **PDF attachment** named `invoice-CC-2026-000042.pdf`. Open it and
check the header, the "Billed to" box, the line items and the total.

> If the invoice can't be issued for any reason, the customer still gets the plain
> booking-confirmation email instead — a paid booking is never left unacknowledged.
> So if you see a confirmation email with **no** attachment, invoicing failed;
> check the server log.

## 2. The number is sequential

Pay for two bookings in a row, then as an admin:

```bash
curl -b cookie.txt http://localhost:3000/api/v1/invoice
```

Expect the numbers to run `CC-<year>-000001`, `CC-<year>-000002`, … with no gaps
and no repeats. The series restarts at `000001` each January.

## 3. Download the PDF

```bash
curl -b cookie.txt -o invoice.pdf \
  http://localhost:3000/api/v1/invoice/<invoiceId>/pdf
```

Expect:

- status `200`
- header `Content-Type: application/pdf`
- header `Content-Disposition: attachment; filename="invoice-CC-2026-000042.pdf"`
- header `Cache-Control: private, no-store`
- a file that opens as a **one-page** PDF

This is the same file the customer received — not a second rendering of it.

In the admin panel: **Invoices → the download icon** on any row, or the
**Download PDF** button in the detail dialog. The Bookings page has the same
action on any paid booking.

## 4. A customer can only see their own

Sign in as a **different** user and request someone else's invoice:

```bash
curl -b other-cookie.txt http://localhost:3000/api/v1/invoice/<invoiceId>
```

Expect `404` (not `403`) — the API must not confirm that an invoice id exists to
someone who isn't entitled to it. The PDF route behaves the same way.

`GET /invoice` (the full list) returns `403` for a non-admin.

## 5. Resending

```bash
curl -b cookie.txt -X POST \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:3000/api/v1/invoice/<invoiceId>/send
```

Expect `200` and a new email in the inbox. The response's `emailCount` goes up by
one each time.

Now try to redirect it:

```bash
-d '{"email":"someone-else@example.com"}'
```

Expect `400`. The recipient always comes from the stored snapshot — the endpoint
must never be usable to mail a branded attachment to an arbitrary address.

If the mail server is down, expect `502` and a message saying why, **not** a
success. `emailCount` stays where it was.

## 6. Issuing one by hand

Useful for bookings paid before invoicing existed, and for offline/cash bookings
an admin entered.

```bash
curl -b cookie.txt -X POST \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{"send": false}' \
  http://localhost:3000/api/v1/invoice/booking/<bookingId>
```

- First call: `201`, a new invoice.
- Call it again: `200`, **the same invoice** (`"Invoice already issued."`), and
  still only one invoice in the database.
- `send: false` means the customer is not emailed — use it when you just want the
  document. Omit it to email the customer as well.
- On an **unpaid** booking: `400`, "This booking has not been paid".

## 7. Refunds

Cancel and refund a paid booking (customer cancel outside the window, admin
cancel, or a refund issued from the Stripe dashboard).

Then re-download the invoice PDF. Expect:

- the pill in the header reads **REFUNDED** in red, not PAID
- the totals box reads **Total refunded**
- the payment note says the charge was returned

The invoice's `status` becomes `refunded`. Re-delivering the same Stripe event
must not change it a second time.

## 8. VAT — individuals

By default no VAT line is printed — the invoice shows one honest total.

Set `INVOICE_VAT_RATE=22` in `server/.env`, restart, and pay for a booking.
Catalogue prices are net, so the rate is added **on top**: a €120.00 catalogue
booking is charged at €146.40 and prints as

```
Subtotal (net)   €120.00
VAT 22%           €26.40
Total            €146.40
```

The charge itself goes up by the VAT — check the Stripe amount, not just the
paperwork. Net + VAT must always equal the total to the cent.

Changing `INVOICE_VAT_RATE` afterwards must **not** restate invoices that were
already issued — the rate is stored on each document.

## 9. VAT — businesses (reverse charge)

A business whose VAT number has been **verified** has no VAT added — it pays the
catalogue price. The full rules and tests are in
[tax/tax-tests.md](../tax/tax-tests.md); the invoice side is:

- the totals block reads `Subtotal (net)` / `VAT — reverse charge €0.00` / `Total`
- the "Billed to" card shows the **company name** and the customer's VAT number
- a teal band carries the statutory notice (Article 196, Directive 2006/112/EC)
- the subtotal and the total are the same number, because nothing was added

Line items are stated net in **both** treatments (catalogue prices already are),
so on either invoice the items must add up to the `Subtotal (net)` line — not to
the total, which carries the VAT.

## 10. Company details on the document

Set the `INVOICE_COMPANY_*` / `INVOICE_VAT_NUMBER` variables in `server/.env`
(see `.env.example` — multi-line addresses use `|` as the line separator), then
issue a new invoice and check they appear in the header and the footer.

Older invoices keep the details they were issued with.

## 11. Non-Latin names

Book as a customer whose name is in Greek, Cyrillic or Georgian, then open the
PDF. The name must render as real letters.

If it prints as `?????`, no Unicode font was found on the machine — set
`INVOICE_FONT_PATH` (and `INVOICE_FONT_BOLD_PATH`) to a TrueType font that covers
those alphabets and restart.
