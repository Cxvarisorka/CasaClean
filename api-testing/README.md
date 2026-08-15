# CasaClean API Testing Guide

This folder is the QA test plan for the CasaClean backend API. It explains, in simple words, **how to test each API endpoint** and **what answer (response) you should expect**.

## Folder structure

```
api-testing/
├── README.md            <- you are here (start here)
├── 00-setup.md          <- how to get ready before testing
├── translations.md      <- multilingual copy: rules shared by the catalogue endpoints
├── auth/                <- login, signup, logout, email verify, Google
│   └── auth-tests.md
├── city/                <- create / read / update / delete cities
│   └── city-tests.md
├── service/             <- create / read / update / delete services
│   └── service-tests.md
├── special-request/     <- booking add-ons (fridge, oven, windows...)
│   └── special-request-tests.md
├── booking/             <- create / read / update / delete bookings
│   └── booking-tests.md
├── invoice/             <- invoices issued after payment (list, PDF, resend)
│   └── invoice-tests.md
├── contact/             <- the website contact form + the admin inbox
│   └── contact-tests.md
└── tax/                 <- VAT: private customers vs verified businesses
    └── tax-tests.md
```

## The base address

Every endpoint starts with this address (when running on your own computer):

```
http://localhost:3000/api/v1
```

So the full address for "sign in" is:

```
http://localhost:3000/api/v1/auth/signin
```

## What the answers look like

The API always answers with JSON.

**When it works (success):**
```json
{
  "status": "success",
  "message": "Some friendly message",
  "data": { }
}
```

**When something is wrong (error):**
```json
{
  "success": false,
  "status": "fail",
  "message": "What went wrong"
}
```

## Status codes you will see (the number the server returns)

| Number | Meaning (simple words)                                    |
|--------|----------------------------------------------------------|
| 200    | OK — it worked                                           |
| 201    | Created — a new thing was made                           |
| 400    | Bad request — you sent something wrong/missing          |
| 401    | Not logged in — you need to sign in first               |
| 403    | Not allowed — you are logged in but lack permission     |
| 404    | Not found — the thing does not exist                    |
| 409    | Conflict — the thing already exists (duplicate)         |
| 500    | Server error — something broke on the server side       |

## Tools you can use to test

- **Postman** or **Insomnia** (easiest — has buttons and forms)
- **Thunder Client** (a VS Code extension)
- **curl** in the terminal (commands are shown in each test file)

### Ready-made Postman collection (recommended)

This folder includes a click-and-run collection: `CasaClean.postman_collection.json`.

**How to use it:**
1. Open Postman → **Import** → drop in `CasaClean.postman_collection.json`.
2. Open the collection's **Variables** tab and set `baseUrl`, `email`, `password`
   (defaults already point at `http://localhost:3000/api/v1`).
3. Run the requests in order: **Auth → Signup**, verify the email by hand,
   **Auth → Signin**, then the **City** and **Service** requests.

Good to know:
- Postman keeps the login cookie (`lt`) automatically after Signin, so the admin
  requests just work (as long as your signed-in user is an admin).
- "Add City" and "Add Service" automatically save the new id into the `cityId` /
  `serviceId` variables, so the Get / Edit / Delete requests reuse them with no copy-paste.
- Each request has built-in checks (in the **Tests** tab) that confirm the status
  code and key fields, so you see green/red ticks after each call.

> **Important about the login cookie:** When you sign in, the server sends back a
> cookie named `lt`. This cookie is how the server knows who you are. Postman and
> the browser keep this cookie automatically. With `curl`, save it with `-c cookie.txt`
> and send it back with `-b cookie.txt` (examples are in the test files).

## Where to go next

1. Read [00-setup.md](00-setup.md) first to get the server running.
2. Then open [auth/auth-tests.md](auth/auth-tests.md).
3. Then [city/city-tests.md](city/city-tests.md).
4. Then [service/service-tests.md](service/service-tests.md).
5. Then [special-request/special-request-tests.md](special-request/special-request-tests.md).
6. Then [booking/booking-tests.md](booking/booking-tests.md).
7. Then [subscription/subscription-tests.md](subscription/subscription-tests.md).
8. Then [invoice/invoice-tests.md](invoice/invoice-tests.md) — the invoice each
   payment produces, and how to export or resend it.
9. Then [tax/tax-tests.md](tax/tax-tests.md) — VAT: what a private customer pays
   versus a business with a verified VAT number.
10. Then [contact/contact-tests.md](contact/contact-tests.md) — the public
    contact form (anyone can post; it's the only unauthenticated write in the
    API) and the admin inbox that receives it.

Alongside those, [translations.md](translations.md) covers the multilingual copy
(`translations`) carried by services, cities, special requests and cleaning
tools — one shared set of rules, plus the language tests to run against each of
those four endpoints.
