# Contact Endpoints — Test Plan

These endpoints back the website's **contact form** (`/contact` on the site).
Anyone can **send** a message — no account needed. Everything else (reading the
inbox, marking a message handled, deleting it) is **admin only**.

Base address: `http://localhost:3000/api/v1/contact`

| Method | Endpoint | Who can use it | What it does                          |
|--------|----------|----------------|---------------------------------------|
| POST   | `/`      | Anyone         | Send a message from the contact form  |
| GET    | `/`      | Admin only     | List messages (the inbox)             |
| GET    | `/:id`   | Admin only     | Get one message                       |
| PATCH  | `/:id`   | Admin only     | Mark it handled / new                 |
| POST   | `/:id/reply` | Admin only | Email an answer to the customer      |
| DELETE | `/:id`   | Admin only     | Delete a message                      |

> **Reminder:** Admin endpoints need an admin login cookie. See [00-setup.md](../00-setup.md).

A message looks like this:
```json
{
  "name": "Jane Cooper",
  "email": "jane@example.com",
  "phone": "+39 06 1234567",
  "topic": "general",
  "message": "Hello, I would like to ask about weekly cleaning for my flat."
}
```

Rules to remember:
- `name` (2–80), `email`, `topic` and `message` (10–1000) are **required**.
  `phone` is optional.
- `topic` must be one of: `general`, `booking`, `pricing`, `partnership`,
  `support`. Anything else is a **400**.
- There is a **hidden honeypot field called `website`**. The real form always
  leaves it empty; bots fill it. If you send it with any value the API answers
  **201 with the same body shape as a real acceptance** (id included) but stores
  **nothing** and sends **no** email — deliberately indistinguishable from
  success, so a bot learns nothing. The only way to see the difference is to
  check the inbox.
- `status`, `handledAt` and `handledBy` are **server-managed**. Sending any of
  them is an unknown field → **400**.
- Every accepted message is **stored first**, then the team is emailed
  (`CONTACT_NOTIFY_EMAIL`, falling back to `MAIL_FROM`). The email is
  fire-and-forget: if the mail host is down the message is still saved and the
  sender still gets a **201**.
- The POST is **rate limited to 5 per hour per IP** and, like every other write
  in this API, needs the `X-Requested-With: XMLHttpRequest` header.

---

## 1. POST `/` — Send a message (public)

**curl:**
```bash
curl -X POST http://localhost:3000/api/v1/contact ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -d "{\"name\":\"Jane Cooper\",\"email\":\"jane@example.com\",\"topic\":\"general\",\"message\":\"I would like a quote for a two-bedroom flat.\"}"
```

### Tests

| #  | What you do                                             | Expected status | Expected answer                                              |
|----|---------------------------------------------------------|-----------------|--------------------------------------------------------------|
| 1  | Send a full, valid message (not logged in)              | **201**         | message: "Message received…" + `data.contactMessage._id`      |
| 2  | Check the admin inbox afterwards                        | **200**         | The message is there with `status: "new"`                     |
| 3  | Check your mail sandbox (Mailtrap)                      | —               | One notification, **Reply-To** = the sender's address         |
| 4  | Leave out `phone`                                       | **201**         | Created; `phone` is empty `""`                                |
| 5  | Send `"website": "http://spam.example"` (honeypot)      | **201**         | Body looks identical to #1 — but **nothing** appears in the inbox |
| 6  | Send `"website": ""`                                     | **201**         | Normal message; it **does** appear in the inbox               |
| 7  | Send a broken email like `"not-an-email"`               | **400**         | validation error on `email`                                   |
| 8  | Send a message shorter than 10 characters               | **400**         | validation error on `message`                                 |
| 9  | Send a message longer than 1000 characters              | **400**         | validation error on `message`                                 |
| 10 | Send `"topic": "refunds"`                                | **400**         | validation error on `topic`                                   |
| 11 | Send `"status": "handled"` alongside valid fields        | **400**         | "Unknown fields are not allowed!"                             |
| 12 | Send the same request **without** `X-Requested-With`     | **403**         | blocked by the CSRF guard                                     |
| 13 | Send 6 messages within an hour from the same IP          | **429**         | "Too many messages sent from this address…"                   |
| 14 | Stop the mail host (bad `MAIL_HOST`), then send one      | **201**         | Still saved — check the inbox; only the email is missing      |

> **Check #5 carefully:** this is the anti-spam behaviour. A honeypot submission
> must look *exactly* like a successful one from the outside. Confirm it by
> looking at the admin inbox, not at the response.

---

## 2. GET `/` — The inbox (admin only)

Supports `?page=` and `?limit=` (max 100), and `?status=new` / `?status=handled`.
Newest first.

**curl:**
```bash
curl -b cookie.txt http://localhost:3000/api/v1/contact
curl -b cookie.txt "http://localhost:3000/api/v1/contact?status=new&limit=5"
```

### Tests

| # | What you do                          | Expected status | Expected answer                                                    |
|---|--------------------------------------|-----------------|---------------------------------------------------------------------|
| 1 | Admin calls it                       | **200**         | `data.contactMessages` list, plus `contactMessageCount` (total)     |
| 2 | A normal user tries                  | **403**         | "You do not have permission to perform this action!"                |
| 3 | Not logged in                        | **401**         | "Authorization is required!"                                        |
| 4 | `?limit=2` with 3 messages stored    | **200**         | List has 2 items; `contactMessageCount` is still 3                  |
| 5 | `?status=handled`                    | **200**         | Only handled messages                                               |
| 6 | Junk filter like `?status=banana`    | **200**         | Filter ignored — everything comes back                              |
| 7 | List comes back newest first         | **200**         | The most recent message is at the top                               |

---

## 3. GET `/:id` — One message (admin only)

### Tests

| # | What you do                   | Expected status | Expected answer                       |
|---|-------------------------------|-----------------|---------------------------------------|
| 1 | Use a real id                 | **200**         | `data.contactMessage`                 |
| 2 | Use an id that does not exist | **404**         | "Contact message not found!"          |
| 3 | Use a broken id (like `123`)  | **400**         | message about invalid id              |
| 4 | A normal user tries           | **403**         | permission error                      |

---

## 4. PATCH `/:id` — Mark handled / new (admin only)

The **only** field you may send is `status`. The message text belongs to the
person who wrote it and can never be edited.

**Example:**
```json
{ "status": "handled" }
```

### Tests

| # | What you do                                  | Expected status | Expected answer                                          |
|---|----------------------------------------------|-----------------|----------------------------------------------------------|
| 1 | Admin sends `{"status":"handled"}`           | **200**         | `status` is `handled`, `handledAt` and `handledBy` are set |
| 2 | Then send `{"status":"new"}`                 | **200**         | `handledAt` and `handledBy` are back to `null`           |
| 3 | Send `{"status":"archived"}`                 | **400**         | "Unknown status."                                        |
| 4 | Try to edit the text: `{"message":"..."}`    | **400**         | "Unknown fields are not allowed!" — text unchanged       |
| 5 | A normal user tries                          | **403**         | permission error                                         |
| 6 | Use an id that does not exist                | **404**         | "Contact message not found to edit!"                     |

---

## 5. POST `/:id/reply` — Answer the customer (admin only)

Sends the answer to the customer by email, saves it on the message, and marks
the message **handled** — all in one step. The **only** field you send is `body`;
the recipient, the subject and the quoted original all come from the stored
message, so a request can't redirect a reply at somebody else.

Unlike the arrival notification, this send is **awaited**. If the mail host is
down you get a **502** and **nothing is recorded** — an admin must never see a
reply logged as sent when the email never left.

**Example:**
```json
{ "body": "Happy to help - a weekly clean of that size is 60 EUR." }
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/v1/contact/PASTE_MESSAGE_ID/reply ^
  -H "Content-Type: application/json" ^
  -H "X-Requested-With: XMLHttpRequest" ^
  -b cookie.txt ^
  -d "{\"body\":\"Happy to help - a weekly clean of that size is 60 EUR.\"}"
```

### Tests

| # | What you do                                              | Expected status | Expected answer                                                       |
|---|----------------------------------------------------------|-----------------|-------------------------------------------------------------------------|
| 1 | Admin sends a valid answer                               | **200**         | "Reply sent successfully!" + the message, now `handled`                 |
| 2 | Check your mail sandbox                                  | —               | Email to the **customer**, subject "Re: your message to CasaClean", the original quoted underneath, **Reply-To** = your team address |
| 3 | Look at the message again                                | **200**         | `replies` has 1 entry with `body`, `sentAt`, `sentBy`                   |
| 4 | Send a second answer                                     | **200**         | `replies` now has 2 entries — the thread is kept                        |
| 5 | Send a body under 10 characters                          | **400**         | "Write a little more before sending."                                   |
| 6 | Send `{"body":"...","email":"attacker@evil.test"}`       | **400**         | "Unknown fields are not allowed!" — you cannot redirect the email       |
| 7 | Break `MAIL_HOST`, then send an answer                   | **502**         | "We couldn't send the reply…" — and `replies` is still **empty**        |
| 8 | A normal user tries                                      | **403**         | permission error                                                        |
| 9 | Use an id that does not exist                            | **404**         | "Contact message not found to reply to!"                                |

> **Check #7 carefully:** this is the difference between this endpoint and the
> arrival notification. The notification is fire-and-forget (a dead mail host
> still gives the customer a 201, because the message is safely stored). A reply
> is the opposite: if it didn't send, it didn't happen.

---

## 6. DELETE `/:id` — Delete a message (admin only)

### Tests

| # | What you do                        | Expected status | Expected answer                          |
|---|------------------------------------|-----------------|------------------------------------------|
| 1 | Admin deletes a real message       | **200**         | "Contact message deleted successfully!"  |
| 2 | Delete the same id again           | **404**         | "Contact message not found to delete!"   |
| 3 | A normal user tries                | **403**         | permission error                         |
| 4 | Not logged in                      | **401**         | "Authorization is required!"             |

---

## Where this shows up in the app

- Website: `/contact` — the form. On success it swaps to a confirmation panel;
  if the request genuinely fails it now shows an error instead (it used to fake
  success while the endpoint didn't exist).
- Admin panel: **Messages** (`/admin/messages`) — the inbox. Open a row to read
  the full message, type an answer and send it (which also marks it handled),
  see every answer already sent, or delete the message.
