# Service Endpoints — Test Plan

These endpoints manage cleaning services. **Reading** is open to everyone.
**Creating, editing, and deleting** is **admin only**.

Base address: `http://localhost:3000/api/v1/service`

| Method | Endpoint     | Who can use it | What it does                  |
|--------|--------------|----------------|-------------------------------|
| GET    | `/`          | Anyone         | Get a list of services        |
| GET    | `/:id`       | Anyone         | Get one service by its id     |
| POST   | `/`          | Admin only     | Add a new service             |
| PATCH  | `/:id`       | Admin only     | Edit a service                |
| DELETE | `/:id`       | Admin only     | Delete a service              |

> **Reminder:** Admin endpoints need an admin login cookie. See [00-setup.md](../00-setup.md).

A service looks like this:
```json
{
  "name": "Regular cleaning",
  "description": "Weekly or bi-weekly cleaning for homes",
  "pricePerHour": 19.9,
  "allCities": false,
  "cities": ["CITY_ID_1", "CITY_ID_2"],
  "recurringEnabled": true,
  "recurringIntervalDays": [7, 14],
  "enabled": true,
  "translations": {
    "it": { "name": "Pulizia regolare", "includes": ["Cucina"] },
    "ka": { "name": "რეგულარული დასუფთავება" }
  }
}
```

Rules about **languages** (`translations`): the top-level `name`, `subtitle`,
`description` and `includes` are the English copy; `translations` holds the same
four fields for `ka`, `it`, `el` and `ru`. The full contract (fallbacks, blanks,
replace-not-merge on PATCH) is shared with the other catalogue endpoints and is
written down once in **[translations.md](../translations.md)** — read it before
running the language tests below.

Rules about **where a service is offered** (coverage) — this is the tricky part:
- `allCities: true` → the service is offered **everywhere**. The `cities` list is ignored.
- `allCities: false` (or not sent) → you **must** give at least one city in `cities`.
- `cities` can be **one id as text** (`"abc123"`) or a **list of ids** (`["abc","def"]`).
- Every city id must be a **real city** that exists, or you get an error.
- Other rules: `name` must be unique, `pricePerHour` cannot be negative.

Rules about **recurring bookings** — the same shape, for cadences instead of cities:
- `recurringEnabled: false` (the default) → the service can only be booked once.
  Any `recurringIntervalDays` you send is cleared.
- `recurringEnabled: true`, empty `recurringIntervalDays` → the customer picks any
  cadence from **every 1 day up to every 14 days**.
- `recurringEnabled: true` with a list → only those cadences are offered. Values are
  deduplicated and sorted; each must be a whole number from 1 to 14 (30 is rejected).
- Turning `recurringEnabled` off later clears the list and **pauses** any live
  subscription on that service at its next charge.

> **Tip:** Create at least one city first (see [city tests](../city/city-tests.md)),
> so you have a real city id to use here.

---

## 1. GET `/` — List services

You can add `?page=` and `?limit=`.

**curl:**
```bash
curl http://localhost:3000/api/v1/service
curl "http://localhost:3000/api/v1/service?page=1&limit=5"
```

### Tests

| # | What you do                       | Expected status | Expected answer                                                |
|---|-----------------------------------|-----------------|----------------------------------------------------------------|
| 1 | Call with no extra options        | **200**         | `data.services` is a list, plus `serviceCount` (total)         |
| 2 | Each service shows its full cities | **200**         | The `cities` field shows full city info, not just ids          |
| 3 | Call with `?limit=2`              | **200**         | List has at most 2 services                                    |
| 4 | Call with junk like `?limit=abc`  | **200**         | Still works — falls back to default                            |

---

## 2. GET `/:id` — Get one service

**curl:**
```bash
curl http://localhost:3000/api/v1/service/PASTE_SERVICE_ID
```

### Tests

| # | What you do                          | Expected status | Expected answer                              |
|---|--------------------------------------|-----------------|----------------------------------------------|
| 1 | Use a real service id                | **200**         | `data.service` with the service, cities filled in |
| 2 | Use an id that does not exist        | **404**         | message: "Service not found!"                |
| 3 | Use a broken id (like `123`)         | **400**         | message about invalid id                     |

---

## 3. POST `/` — Add a service (admin only)

**Example A — offered in specific cities:**
```json
{
  "name": "Regular cleaning",
  "description": "Weekly cleaning for homes",
  "pricePerHour": 19.9,
  "cities": ["PASTE_REAL_CITY_ID"]
}
```

**Example B — offered everywhere:**
```json
{
  "name": "Deep cleaning",
  "description": "Full deep clean",
  "pricePerHour": 30,
  "allCities": true
}
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/v1/service ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"name\":\"Deep cleaning\",\"description\":\"Full deep clean\",\"pricePerHour\":30,\"allCities\":true}"
```

### Tests

| # | What you do                                                  | Expected status | Expected answer                                                       |
|---|-------------------------------------------------------------|-----------------|-----------------------------------------------------------------------|
| 1 | Admin sends name + description + price + a real city id     | **201**         | message: "Service created successfully!" + `data.service`             |
| 2 | Send `allCities: true` (no cities)                          | **201**         | Created; `data.service.allCities` is true and `cities` is empty       |
| 3 | Send a single city as text (`"cities": "id"`)              | **201**         | Created with that one city                                            |
| 4 | Send the same city id twice in the list                    | **201**         | Duplicates removed — city is stored only once                        |
| 5 | Name capital letter fixed ("regular" → "Regular")          | **201**         | `data.service.name` starts with a capital letter                     |
| 6 | Add a service with a name that already exists              | **409**         | message: "Service already exists!"                                    |
| 7 | Leave out name, description, or price                      | **400**         | message: "Please provide name, description and pricePerHour!"         |
| 8 | `allCities` is false and `cities` is empty/missing         | **400**         | message: "Please select at least one city, or set allCities to true!"|
| 9 | Use a city id that does not exist                          | **400**         | message: "One or more selected cities do not exist!"                  |
| 10| Send a negative price like `-5`                            | **400**         | message about price can't be negative                                |
| 11| A normal user (not admin) tries this                       | **403**         | "You do not have permission to perform this action!"                 |
| 12| Not logged in                                              | **401**         | "Authorization is required!"                                          |
| 13| Send `translations` with `it` and `ka` filled in           | **201**         | `data.service.translations` holds both languages                      |
| 14| Send a language where every field is blank                 | **201**         | That language is **not** in `data.service.translations`               |
| 15| Send `translations: { "fr": { "name": "Nettoyage" } }`     | **400**         | message about supported translation languages                        |
| 16| Send `translations: { "en": { "name": "Clean" } }`         | **400**         | Rejected — English belongs in the top-level fields                    |

> **Check #7 carefully:** `pricePerHour: 0` is allowed (free). Only a **missing** price
> is rejected. So sending `pricePerHour: 0` should succeed.

---

## 4. PATCH `/:id` — Edit a service (admin only)

Only send the fields you want to change.

**Example — change price and turn it off:**
```json
{
  "pricePerHour": 25,
  "enabled": false
}
```

**curl:**
```bash
curl -X PATCH http://localhost:3000/api/v1/service/PASTE_SERVICE_ID ^
  -H "Content-Type: application/json" ^
  -b cookie.txt ^
  -d "{\"pricePerHour\":25,\"enabled\":false}"
```

### Tests

| # | What you do                                                  | Expected status | Expected answer                                  |
|---|-------------------------------------------------------------|-----------------|--------------------------------------------------|
| 1 | Admin changes the price                                    | **200**         | message: "Service edited successfully!" + new value |
| 2 | Set `enabled` to `false`                                   | **200**         | `data.service.enabled` is false                  |
| 3 | Change coverage to `allCities: true`                      | **200**         | `cities` becomes empty, `allCities` true         |
| 4 | Change coverage to a new list of real city ids            | **200**         | `cities` updated to the new list                 |
| 5 | Only change the name/price (don't send coverage)          | **200**         | The old cities stay the same (untouched)         |
| 6 | Rename to a name another service already has              | **409**         | message: "Service already exists!"               |
| 7 | Edit a service id that does not exist                     | **404**         | message: "Service not found to edit!"            |
| 8 | Set coverage to a city id that does not exist             | **400**         | "One or more selected cities do not exist!"      |
| 9 | A normal user tries this                                   | **403**         | "You do not have permission..."                  |
| 10| Not logged in                                             | **401**         | "Authorization is required!"                     |
| 11| Change only the price (don't send `translations`)          | **200**         | All existing translations are still there        |
| 12| Send `translations` with only `it` (a service that had `it` + `ka`) | **200** | Only `it` remains — `ka` was removed             |
| 13| Send `translations: {}`                                    | **200**         | All translations removed; English copy untouched |

---

## 5. DELETE `/:id` — Delete a service (admin only)

**curl:**
```bash
curl -X DELETE http://localhost:3000/api/v1/service/PASTE_SERVICE_ID -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                                  |
|---|--------------------------------------|-----------------|--------------------------------------------------|
| 1 | Admin deletes a real service         | **200**         | message: "Service deleted successfully!"         |
| 2 | Delete the same service again        | **404**         | message: "Service not found to delete!"          |
| 3 | Delete an id that does not exist     | **404**         | message: "Service not found to delete!"          |
| 4 | Delete with a broken id              | **400**         | message about invalid id                         |
| 5 | A normal user tries this             | **403**         | "You do not have permission..."                  |
| 6 | Not logged in                        | **401**         | "Authorization is required!"                     |
| 7 | Delete a service that had an uploaded cover image | **200** | The file under `server/uploads/services/` is gone too |

---

## 6. Cover image upload (admin only)

POST `/` and PATCH `/:id` accept **one** cover image as `multipart/form-data`
instead of JSON. The file is stored in `server/uploads/services/` and the
service's `image` field holds the path it is served from, e.g.
`/uploads/services/1770000000000-ab12….png`. Fetch it at
`http://localhost:3000/uploads/services/…` (no login needed — it's public
imagery).

Because multipart carries only text, send the non-string fields like this:
- numbers and booleans as text — `pricePerHour=19.9`, `allCities=false`
- lists as **JSON text** — `cities=["CITY_ID"]`, `includes=["Kitchen"]`
  (that's the only way an empty list `[]` survives the trip)

Rules: PNG / JPEG / WebP / GIF only, **5 MB** max, exactly one file, under the
field name `image`. The stored filename is generated by the server — the name
you upload is ignored.

**curl:**
```bash
# Create with a cover image
curl -X POST http://localhost:3000/api/v1/service -b cookie.txt \
  -H "X-Requested-With: XMLHttpRequest" \
  -F "name=Deep cleaning" \
  -F "description=A thorough clean of the whole property" \
  -F "pricePerHour=24.5" \
  -F "allCities=true" \
  -F "cities=[]" \
  -F "image=@./cover.png"

# Replace just the image on an existing service
curl -X PATCH http://localhost:3000/api/v1/service/PASTE_SERVICE_ID -b cookie.txt \
  -H "X-Requested-With: XMLHttpRequest" \
  -F "image=@./new-cover.png"
```

### Tests

| # | What you do                                              | Expected status | Expected answer                                            |
|---|----------------------------------------------------------|-----------------|-------------------------------------------------------------|
| 1 | Admin creates a service with a PNG attached              | **201**         | `data.service.image` starts with `/uploads/services/`        |
| 2 | Open that path in the browser                            | **200**         | The image loads                                              |
| 3 | Check `server/uploads/services/`                         | —               | The file is there, with a server-generated name              |
| 4 | PATCH the same service with a different image            | **200**         | New path returned; the **old file is deleted** from disk     |
| 5 | PATCH sending `{"image": ""}` as JSON                    | **200**         | `image` is `""` and the file is deleted                      |
| 6 | PATCH sending the same `/uploads/services/…` path back   | **200**         | Nothing changes, file still there                            |
| 7 | Upload a `.txt` / `.php` / SVG file                      | **400**         | "Image must be a PNG, JPEG, WebP or GIF file!"; nothing saved |
| 8 | Upload a file larger than 5 MB                           | **413**         | "Image is too large — 5 MB maximum!"                         |
| 9 | Attach two files, or use a field name other than `image` | **400**         | 'Only a single file, sent as "image", may be uploaded!'      |
| 10| Upload with a bad name (e.g. `name=Ab`)                  | **400**         | Validation error — and **no orphan file** is left on disk    |
| 11| Upload a name that already exists                        | **409**         | "Service already exists!" — and no orphan file               |
| 12| A normal user / logged-out caller uploads                | **403** / **401** | Rejected before multer ever writes anything                |
