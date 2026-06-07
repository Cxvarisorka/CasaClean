# Booking Endpoints — Test Plan

These endpoints manage cleaning **bookings** (a customer's reservation).
You must be **logged in** to make a booking. A logged-in user can create a
booking and see **their own** bookings. Listing **all** bookings, viewing any
single booking, editing, and deleting are **admin only**.

Base address: `http://localhost:3000/api/v1/booking`

| Method | Endpoint   | Who can use it     | What it does                          |
|--------|------------|--------------------|---------------------------------------|
| POST   | `/`        | Any logged-in user | Create a new booking                  |
| GET    | `/my`      | Any logged-in user | List **your own** bookings            |
| GET    | `/`        | Admin only         | List **all** bookings                 |
| GET    | `/:id`     | Admin only         | Get one booking by its id             |
| PATCH  | `/:id`     | Admin only         | Edit a booking                        |
| DELETE | `/:id`     | Admin only         | Delete a booking                      |

> **Reminder:** Every booking endpoint needs a login cookie. The admin ones also
> need the admin role. See [00-setup.md](../00-setup.md).

A booking request body looks like this:
```json
{
  "serviceId": 1,
  "cityId": 1,
  "streetName": "Rustaveli Ave",
  "houseNumber": "12",
  "propertySize": "80m2",
  "doorbellName": "Smith",
  "bookingDate": "2026-07-01",
  "bookingTime": "14:00",
  "hours": 3,
  "cleaners": 2,
  "totalAmount": 120,
  "notes": "Please bring eco products",
  "specialRequests": ["PASTE_SPECIAL_REQUEST_ID"],
  "supplies": ["vacuum", "mop"]
}
```

Important things to know:
- **Contact details come from your account.** You do **not** send `customerName`
  or `customerEmail` — the server fills those from your logged-in profile.
- **Phone:** if your account has a phone number, it is used automatically. If it
  does not (for example a Google account), you must send `customerPhone` in the body.
- **Required fields:** `serviceId`, `cityId`, `streetName`, `houseNumber`,
  `propertySize`, `doorbellName`, `bookingDate`, `bookingTime`, `hours`,
  `cleaners`, `totalAmount`. Missing any of these gives a 400.
- **`serviceId` / `cityId` are numbers** (the current client contract), not ids
  of real City/Service documents. Sending `0` is allowed (it is a real value).
- **`specialRequests`** must be a list of ids of **existing, enabled** add-ons.
  See [special-request tests](../special-request/special-request-tests.md).
- **`supplies`** is a free list of text tags. Anything that is not a list is
  ignored (stored as an empty list).
- A new booking's `status` defaults to **`confirmed`**.
- A confirmation **email** is sent after creating, but if the email fails the
  booking is **still saved** (email is best-effort).

> **Tip:** Create one or more enabled special requests first, so you have a real
> id to put in `specialRequests`.

---

## 1. POST `/` — Create a booking (any logged-in user)

**curl:**
```bash
curl -X POST http://localhost:3000/api/v1/booking ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"serviceId\":1,\"cityId\":1,\"streetName\":\"Rustaveli Ave\",\"houseNumber\":\"12\",\"propertySize\":\"80m2\",\"doorbellName\":\"Smith\",\"bookingDate\":\"2026-07-01\",\"bookingTime\":\"14:00\",\"hours\":3,\"cleaners\":2,\"totalAmount\":120}"
```

### Tests

| #  | What you do                                                        | Expected status | Expected answer                                                     |
|----|-------------------------------------------------------------------|-----------------|---------------------------------------------------------------------|
| 1  | Logged-in user sends all required fields                          | **201**         | message: "Booking created successfully!" + `data.booking`           |
| 2  | Check the contact details on the result                          | **201**         | `customerName` / `customerEmail` match your account (not the body)  |
| 3  | New booking status                                               | **201**         | `data.booking.status` is `"confirmed"`                              |
| 4  | Send valid `specialRequests` (enabled add-on ids)               | **201**         | Created; `data.booking.specialRequests` holds those ids             |
| 5  | Send the same special request id twice                          | **201**         | Created; the duplicate is removed (stored once)                     |
| 6  | Send `specialRequests: []` or leave it out                      | **201**         | Created; `specialRequests` is an empty list                         |
| 7  | Send `supplies` as a list                                       | **201**         | Created; `supplies` saved as given                                  |
| 8  | Send `supplies` as something that is not a list (e.g. a string) | **201**         | Created; `supplies` becomes an empty list                           |
| 9  | Send `serviceId: 0` and `cityId: 0`                             | **201**         | Created — `0` is a valid value (not treated as missing)             |
| 10 | Leave out a required field (e.g. `streetName`)                  | **400**         | message: "Please provide all required fields for booking!"          |
| 11 | Leave out `hours` / `cleaners` / `totalAmount`                  | **400**         | message: "Please provide all required fields for booking!"          |
| 12 | Account has **no** phone and you do **not** send `customerPhone` | **400**         | message: "Please add a phone number to your profile or provide one for this booking!" |
| 13 | Account has no phone but you **do** send `customerPhone`        | **201**         | Created; `customerPhone` uses the value you sent                    |
| 14 | `specialRequests` is not a list (e.g. a string)                 | **400**         | message: "specialRequests must be an array of ids!"                 |
| 15 | `specialRequests` has a broken id (like `"123"`)               | **400**         | message: "One or more special request ids are invalid!"             |
| 16 | `specialRequests` has an id that does not exist                 | **400**         | message: "One or more selected special requests do not exist or are unavailable!" |
| 17 | `specialRequests` points to a **disabled** add-on              | **400**         | message: "One or more selected special requests do not exist or are unavailable!" |
| 18 | Not logged in                                                   | **401**         | "Authorization is required!"                                        |

> **Check #2 carefully:** Even if you send `customerName` or `customerEmail` in
> the body, the server **ignores** them and uses your account details. This is on
> purpose — you cannot book under someone else's name.

---

## 2. GET `/my` — List your own bookings (any logged-in user)

You can add `?page=` and `?limit=`. Newest first.

**curl:**
```bash
curl http://localhost:3000/api/v1/booking/my -b cookie.txt
curl "http://localhost:3000/api/v1/booking/my?page=1&limit=5" -b cookie.txt
```

### Tests

| # | What you do                                          | Expected status | Expected answer                                                 |
|---|------------------------------------------------------|-----------------|-----------------------------------------------------------------|
| 1 | Logged-in user with some bookings                    | **200**         | `data.bookings` is a list, plus `bookingCount`                  |
| 2 | The list only shows **your** bookings                | **200**         | No booking from another user appears                            |
| 3 | Special requests are filled in                       | **200**         | Each booking's `specialRequests` shows full add-on info, not just ids |
| 4 | A user with no bookings                              | **200**         | `data.bookings` is an empty list, `bookingCount` is `0`         |
| 5 | Call with `?limit=2`                                 | **200**         | List has at most 2 bookings                                     |
| 6 | Not logged in                                        | **401**         | "Authorization is required!"                                    |

---

## 3. GET `/` — List all bookings (admin only)

You can add `?page=` and `?limit=`. Newest first.

**curl:**
```bash
curl http://localhost:3000/api/v1/booking -b cookie.txt
curl "http://localhost:3000/api/v1/booking?page=1&limit=5" -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                                              |
|---|--------------------------------------|-----------------|--------------------------------------------------------------|
| 1 | Admin lists bookings                  | **200**         | `data.bookings` is a list, plus `bookingCount` (total)       |
| 2 | List includes bookings from everyone | **200**         | Not limited to the admin's own bookings                      |
| 3 | Call with `?limit=2`                 | **200**         | List has at most 2 bookings                                  |
| 4 | Call with junk like `?limit=abc`     | **200**         | Still works — falls back to default (10)                     |
| 5 | A normal user tries this             | **403**         | "You do not have permission to perform this action!"         |
| 6 | Not logged in                        | **401**         | "Authorization is required!"                                 |

---

## 4. GET `/:id` — Get one booking (admin only)

**curl:**
```bash
curl http://localhost:3000/api/v1/booking/PASTE_BOOKING_ID -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                                       |
|---|--------------------------------------|-----------------|-------------------------------------------------------|
| 1 | Admin uses a real booking id         | **200**         | `data.booking` with the booking, special requests filled in |
| 2 | Use an id that does not exist        | **404**         | message: "Booking not found!"                         |
| 3 | Use a broken id (like `123`)         | **400**         | message about invalid id                              |
| 4 | A normal user tries this             | **403**         | "You do not have permission..."                       |
| 5 | Not logged in                        | **401**         | "Authorization is required!"                          |

---

## 5. PATCH `/:id` — Edit a booking (admin only)

Only send the fields you want to change. The admin can edit these fields:
`status`, `bookingDate`, `bookingTime`, `hours`, `cleaners`, `totalAmount`,
`streetName`, `houseNumber`, `propertySize`, `doorbellName`, `customerPhone`,
`notes`, `supplies`, and `specialRequests`.

Anything else (like `user`, `customerEmail`, or payment fields) is **ignored**.

`status` must be one of: `pending`, `confirmed`, `cancelled`, `completed`.

**Example — confirm a date change and mark completed:**
```json
{
  "status": "completed",
  "bookingDate": "2026-07-02",
  "totalAmount": 130
}
```

**curl:**
```bash
curl -X PATCH http://localhost:3000/api/v1/booking/PASTE_BOOKING_ID ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"status\":\"completed\",\"totalAmount\":130}"
```

### Tests

| #  | What you do                                                  | Expected status | Expected answer                                          |
|----|-------------------------------------------------------------|-----------------|----------------------------------------------------------|
| 1  | Admin changes the `status` to `completed`                   | **200**         | message: "Booking updated successfully!" + new status    |
| 2  | Change `bookingDate` / `bookingTime`                        | **200**         | New values saved                                         |
| 3  | Change `totalAmount`                                        | **200**         | `data.booking.totalAmount` updated                       |
| 4  | Replace `specialRequests` with other valid enabled ids     | **200**         | `specialRequests` updated to the new list                |
| 5  | Send `specialRequests` with a disabled / missing id        | **400**         | message about special requests not existing / unavailable |
| 6  | Try to change `customerEmail` or `user` in the body        | **200**         | Those are ignored — the booking keeps the original values |
| 7  | Send an invalid `status` (e.g. `"done"`)                   | **400**         | validation error (status must be one of the allowed values) |
| 8  | Send a negative `totalAmount` (e.g. `-5`)                  | **400**         | validation error (amount can't be negative)              |
| 9  | Edit an id that does not exist                             | **404**         | message: "Booking not found!"                            |
| 10 | Use a broken id                                           | **400**         | message about invalid id                                 |
| 11 | A normal user tries this                                  | **403**         | "You do not have permission..."                          |
| 12 | Not logged in                                             | **401**         | "Authorization is required!"                             |

> **Check #6 carefully:** The edit only touches a fixed list of allowed fields.
> Sending `user`, `customerEmail`, `paymentIntentId`, etc. should have **no effect** —
> this protects ownership and payment data from being changed by accident.

---

## 6. DELETE `/:id` — Delete a booking (admin only)

**curl:**
```bash
curl -X DELETE http://localhost:3000/api/v1/booking/PASTE_BOOKING_ID -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                              |
|---|--------------------------------------|-----------------|----------------------------------------------|
| 1 | Admin deletes a real booking         | **200**         | message: "Booking deleted successfully!"     |
| 2 | Delete the same booking again        | **404**         | message: "Booking not found!"                |
| 3 | Delete an id that does not exist     | **404**         | message: "Booking not found!"                |
| 4 | Delete with a broken id              | **400**         | message about invalid id                     |
| 5 | A normal user tries this             | **403**         | "You do not have permission..."              |
| 6 | Not logged in                        | **401**         | "Authorization is required!"                 |
