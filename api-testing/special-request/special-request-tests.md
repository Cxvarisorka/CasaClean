# Special Request Endpoints — Test Plan

These endpoints manage the **add-ons** a customer can attach to a booking
(for example "Fridge cleaning", "Inside oven", "Interior windows").
**Reading** is open to everyone (the booking wizard shows the list).
**Creating, editing, and deleting** is **admin only**.

Base address: `http://localhost:3000/api/v1/special-request`

| Method | Endpoint   | Who can use it | What it does                          |
|--------|------------|----------------|---------------------------------------|
| GET    | `/`        | Anyone         | Get a list of special requests        |
| GET    | `/:id`     | Anyone         | Get one special request by its id     |
| POST   | `/`        | Admin only     | Add a new special request             |
| PATCH  | `/:id`     | Admin only     | Edit a special request                |
| DELETE | `/:id`     | Admin only     | Delete a special request              |

> **Reminder:** Admin endpoints need an admin login cookie. See [00-setup.md](../00-setup.md).

A special request looks like this:
```json
{
  "name": "Fridge cleaning",
  "description": "Clean the inside of the fridge",
  "price": 15,
  "enabled": true
}
```

Rules to remember:
- `name` is **required** and must be **unique**.
- `price` is **required**. `0` is allowed (a free / informational add-on).
- `price` cannot be **negative**.
- The name is **auto-formatted**: the first letter becomes a capital and the
  rest becomes lowercase. So `"fRIDGE cleaning"` is stored as `"Fridge cleaning"`.
  This means `"FRIDGE CLEANING"` and `"fridge cleaning"` count as the **same** name.
- `enabled` is a soft on/off switch. A disabled add-on still exists but can't be
  selected on a new booking (see [booking tests](../booking/booking-tests.md)).

> **Tip:** Create at least one special request here first, then copy its id into
> the booking tests to check the "special requests" part of a booking.

---

## 1. GET `/` — List special requests

Public. You can add `?page=` and `?limit=`. Newest first.

**curl:**
```bash
curl http://localhost:3000/api/v1/special-request
curl "http://localhost:3000/api/v1/special-request?page=1&limit=5"
```

### Tests

| # | What you do                      | Expected status | Expected answer                                                  |
|---|----------------------------------|-----------------|------------------------------------------------------------------|
| 1 | Call with no extra options       | **200**         | `data.specialRequests` is a list, plus `specialRequestCount` (total) |
| 2 | Call when not logged in          | **200**         | Still works — this endpoint is public                            |
| 3 | Call with `?limit=2`             | **200**         | List has at most 2 items                                         |
| 4 | Call with junk like `?limit=abc` | **200**         | Still works — falls back to default (10)                         |
| 5 | List comes back newest first     | **200**         | The most recently created item is at the top                    |

---

## 2. GET `/:id` — Get one special request

Public.

**curl:**
```bash
curl http://localhost:3000/api/v1/special-request/PASTE_REQUEST_ID
```

### Tests

| # | What you do                      | Expected status | Expected answer                          |
|---|----------------------------------|-----------------|------------------------------------------|
| 1 | Use a real id                    | **200**         | `data.specialRequest` with the item      |
| 2 | Use an id that does not exist    | **404**         | message: "Special request not found!"    |
| 3 | Use a broken id (like `123`)     | **400**         | message about invalid id                 |

---

## 3. POST `/` — Add a special request (admin only)

**Example:**
```json
{
  "name": "Fridge cleaning",
  "description": "Clean the inside of the fridge",
  "price": 15
}
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/v1/special-request ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"name\":\"Fridge cleaning\",\"description\":\"Clean the inside of the fridge\",\"price\":15}"
```

### Tests

| #  | What you do                                            | Expected status | Expected answer                                                |
|----|--------------------------------------------------------|-----------------|----------------------------------------------------------------|
| 1  | Admin sends name + description + price                  | **201**         | message: "Special request created successfully!" + `data.specialRequest` |
| 2  | Send `price: 0` (free add-on)                          | **201**         | Created; `data.specialRequest.price` is `0`                    |
| 3  | Send only name + price (no description)                | **201**         | Created; description defaults to empty `""`                    |
| 4  | New item is enabled by default                         | **201**         | `data.specialRequest.enabled` is `true`                        |
| 5  | Name capital letter fixed ("fridge" → "Fridge")        | **201**         | `data.specialRequest.name` starts with a capital letter        |
| 6  | Add an item whose name already exists (any casing)     | **409**         | message: "Special request already exists!"                     |
| 7  | Leave out the name                                     | **400**         | message: "Please provide a name and price!"                    |
| 8  | Leave out the price                                    | **400**         | message: "Please provide a name and price!"                    |
| 9  | Send a negative price like `-5`                        | **400**         | message about price can't be negative                          |
| 10 | A normal user (not admin) tries this                   | **403**         | "You do not have permission to perform this action!"           |
| 11 | Not logged in                                          | **401**         | "Authorization is required!"                                   |

> **Check #2 carefully:** `price: 0` is allowed (free). Only a **missing** price
> is rejected. So sending `price: 0` should succeed, but leaving price out should fail.

---

## 4. PATCH `/:id` — Edit a special request (admin only)

Only send the fields you want to change.

**Example — change price and turn it off:**
```json
{
  "price": 20,
  "enabled": false
}
```

**curl:**
```bash
curl -X PATCH http://localhost:3000/api/v1/special-request/PASTE_REQUEST_ID ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"price\":20,\"enabled\":false}"
```

### Tests

| #  | What you do                                                  | Expected status | Expected answer                                            |
|----|-------------------------------------------------------------|-----------------|------------------------------------------------------------|
| 1  | Admin changes the price                                      | **200**         | message: "Special request edited successfully!" + new value |
| 2  | Set `enabled` to `false`                                    | **200**         | `data.specialRequest.enabled` is `false`                   |
| 3  | Set `enabled` back to `true`                                | **200**         | `data.specialRequest.enabled` is `true`                    |
| 4  | Change only the description                                  | **200**         | Description updated, other fields untouched                |
| 5  | Rename the item (e.g. "fridge" → "Fridge deep")             | **200**         | New name saved, capital letter fixed                       |
| 6  | Rename to the **same** name it already has                  | **200**         | Works — it does not falsely report a duplicate             |
| 7  | Rename to a name another item already has                   | **409**         | message: "Special request already exists!"                 |
| 8  | Set `price: 0`                                              | **200**         | `data.specialRequest.price` is `0`                         |
| 9  | Edit an id that does not exist                              | **404**         | message: "Special request not found to edit!"              |
| 10 | A normal user tries this                                    | **403**         | "You do not have permission..."                            |
| 11 | Not logged in                                               | **401**         | "Authorization is required!"                               |

---

## 5. DELETE `/:id` — Delete a special request (admin only)

**curl:**
```bash
curl -X DELETE http://localhost:3000/api/v1/special-request/PASTE_REQUEST_ID -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                                     |
|---|--------------------------------------|-----------------|-----------------------------------------------------|
| 1 | Admin deletes a real item            | **200**         | message: "Special request deleted successfully!"    |
| 2 | Delete the same item again           | **404**         | message: "Special request not found to delete!"     |
| 3 | Delete an id that does not exist     | **404**         | message: "Special request not found to delete!"     |
| 4 | Delete with a broken id              | **400**         | message about invalid id                            |
| 5 | A normal user tries this             | **403**         | "You do not have permission..."                     |
| 6 | Not logged in                        | **401**         | "Authorization is required!"                        |

> **Note:** Deleting a special request does **not** remove it from bookings that
> already reference it. Those old bookings keep the id. Deletion only stops the
> item from being picked on **new** bookings.
