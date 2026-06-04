# City Endpoints — Test Plan

These endpoints manage cities. **Reading** cities is open to everyone.
**Creating, editing, and deleting** cities is **admin only**.

Base address: `http://localhost:3000/api/v1/city`

| Method | Endpoint     | Who can use it | What it does                 |
|--------|--------------|----------------|------------------------------|
| GET    | `/`          | Anyone         | Get a list of cities         |
| GET    | `/:id`       | Anyone         | Get one city by its id       |
| POST   | `/`          | Admin only     | Add a new city               |
| PATCH  | `/:id`       | Admin only     | Edit a city                  |
| DELETE | `/:id`       | Admin only     | Delete a city                |

> **Reminder:** For the admin endpoints you must be logged in as an admin user and
> send the `lt` cookie. See [00-setup.md](../00-setup.md) on how to make an admin.

A city looks like this:
```json
{
  "name": "Rome",
  "workingHourStarts": "09:00",
  "workingHourEnds": "17:30",
  "enabled": true
}
```

Rules:
- `name` must be unique. The server fixes the capital letter for you ("rOme" → "Rome").
- `workingHourStarts` and `workingHourEnds` must be in **HH:MM** format (00:00 to 23:59).
- `enabled` is true/false; it is an on/off switch to hide a city without deleting it.

---

## 1. GET `/` — List cities

You can add `?page=` and `?limit=` to the address to control paging.

**curl:**
```bash
curl http://localhost:3000/api/v1/city
curl "http://localhost:3000/api/v1/city?page=1&limit=5"
```

### Tests

| # | What you do                       | Expected status | Expected answer                                                        |
|---|-----------------------------------|-----------------|------------------------------------------------------------------------|
| 1 | Call with no extra options        | **200**         | `data.cities` is a list, plus `cityCount` (total) and `length`         |
| 2 | Call with `?limit=2`              | **200**         | The list has at most 2 cities                                          |
| 3 | Call with `?page=2&limit=2`       | **200**         | You get the next page of cities                                        |
| 4 | Call with junk like `?limit=abc`  | **200**         | Still works — server falls back to the default (10)                    |
| 5 | Call with `?limit=9999`           | **200**         | List is capped at 100 max                                              |

---

## 2. GET `/:id` — Get one city

**curl:**
```bash
curl http://localhost:3000/api/v1/city/PASTE_CITY_ID
```

### Tests

| # | What you do                          | Expected status | Expected answer                          |
|---|--------------------------------------|-----------------|------------------------------------------|
| 1 | Use a real city id                   | **200**         | `data.city` with that city's info        |
| 2 | Use an id that does not exist        | **404**         | message: "City can't be found!"          |
| 3 | Use a broken id (like `123`)         | **400**         | message about invalid id                 |

---

## 3. POST `/` — Add a city (admin only)

**What to send (body, JSON):**
```json
{
  "name": "Rome",
  "workingHourStarts": "09:00",
  "workingHourEnds": "17:30"
}
```

**curl (admin cookie needed):**
```bash
curl -X POST http://localhost:3000/api/v1/city ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"name\":\"Rome\",\"workingHourStarts\":\"09:00\",\"workingHourEnds\":\"17:30\"}"
```

### Tests

| # | What you do                                         | Expected status | Expected answer                                                       |
|---|-----------------------------------------------------|-----------------|-----------------------------------------------------------------------|
| 1 | Admin sends all 3 fields correctly                  | **201**         | message: "City added successfully!" + `data.city`                     |
| 2 | Name capital letter is fixed ("rome" → "Rome")      | **201**         | `data.city.name` is "Rome"                                            |
| 3 | Add a city that already exists (same name)          | **409**         | message: "City already exists!"                                       |
| 4 | Leave out one of the 3 fields                       | **400**         | message: "Please provide name, workingHourStarts and workingHourEnds!"|
| 5 | Send a bad time like `"9am"`                         | **400**         | message about HH:MM format                                            |
| 6 | A **normal user** (not admin) tries this            | **403**         | message: "You do not have permission to perform this action!"        |
| 7 | **Not logged in** at all                            | **401**         | message: "Authorization is required!"                                 |

---

## 4. PATCH `/:id` — Edit a city (admin only)

You only send the fields you want to change.

**What to send (body, JSON) — example:**
```json
{
  "workingHourEnds": "18:00",
  "enabled": false
}
```

**curl:**
```bash
curl -X PATCH http://localhost:3000/api/v1/city/PASTE_CITY_ID ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"workingHourEnds\":\"18:00\",\"enabled\":false}"
```

### Tests

| # | What you do                                      | Expected status | Expected answer                                  |
|---|--------------------------------------------------|-----------------|--------------------------------------------------|
| 1 | Admin changes the working hours                  | **200**         | message: "City successfully edited!" + new value |
| 2 | Set `enabled` to `false`                         | **200**         | `data.city.enabled` is false (off switch works)  |
| 3 | Rename to a name another city already has        | **409**         | message: "City already exists!"                  |
| 4 | Edit a city id that does not exist               | **404**         | message: "City can't be found to edit!"          |
| 5 | Send a bad time format                            | **400**         | message about HH:MM format                       |
| 6 | A normal user tries this                          | **403**         | "You do not have permission..."                  |
| 7 | Not logged in                                     | **401**         | "Authorization is required!"                     |

---

## 5. DELETE `/:id` — Delete a city (admin only)

**curl:**
```bash
curl -X DELETE http://localhost:3000/api/v1/city/PASTE_CITY_ID -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                                  |
|---|--------------------------------------|-----------------|--------------------------------------------------|
| 1 | Admin deletes a real city            | **200**         | message: "City deleted successfully!"            |
| 2 | Delete the same city again           | **404**         | message: "City can't be found to delete!"        |
| 3 | Delete an id that does not exist     | **404**         | message: "City can't be found to delete!"        |
| 4 | Delete with a broken id              | **400**         | message about invalid id                         |
| 5 | A normal user tries this             | **403**         | "You do not have permission..."                  |
| 6 | Not logged in                        | **401**         | "Authorization is required!"                     |
