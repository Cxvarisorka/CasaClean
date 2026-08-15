# Multilingual copy (`translations`) — shared rules

The site is offered in **five languages**: English (`en`), Georgian (`ka`),
Italian (`it`), Greek (`el`) and Russian (`ru`).

Four catalogue resources carry customer-facing copy in all of them and follow
exactly the same rules, so they are written down once here:

| Resource        | Endpoint                     | Translatable fields                          |
|-----------------|------------------------------|----------------------------------------------|
| Service         | `/api/v1/service`            | `name`, `subtitle`, `description`, `includes`|
| City            | `/api/v1/city`               | `name`                                       |
| Special request | `/api/v1/special-request`    | `name`, `description`                        |
| Cleaning tool   | `/api/v1/cleaning-tool`      | `name`, `description`                        |

## How the copy is stored

The **top-level fields** (`name`, `description`, …) hold the **English** text.
They are the ones that must always be filled in — everything else falls back to
them. The other four languages live in a `translations` object, keyed by
language code:

```json
{
  "name": "Regular cleaning",
  "description": "Weekly or bi-weekly cleaning for homes",
  "translations": {
    "it": { "name": "Pulizia regolare", "description": "Pulizia settimanale per la casa" },
    "ka": { "name": "რეგულარული დასუფთავება" }
  }
}
```

## The rules

- Sending `en` inside `translations` is **rejected** — English already lives in
  the top-level fields, and two sources of truth for the same text is a bug.
- Every field inside a language is **optional**, and each one falls back on its
  own. In the example above the Georgian card shows the translated title next to
  the *English* description — a half-translated language is a normal, valid
  state, which is what lets the admin panel do one language at a time.
- Blank values are **not stored**: `"   "` is the same as not sending the field,
  and a language where everything is blank disappears from the record entirely.
- A translation may not be **longer** than the field allows (the same limits as
  the English field).
- On PATCH the map is **replaced, not merged** — send every language you want to
  keep. Leaving a language out deletes its translation; `"translations": {}`
  deletes them all; omitting the `translations` field entirely leaves every
  stored translation untouched.
- Unknown language codes (e.g. `fr`) and unknown fields inside a language are
  rejected with **400**.

## Tests to run against each of the four endpoints

| # | What you do                                                     | Expected status | Expected answer                                        |
|---|-----------------------------------------------------------------|-----------------|---------------------------------------------------------|
| 1 | Create with `translations` for `it` and `ka`                    | **201**         | `translations` holds both languages                     |
| 2 | Create with a language where every field is blank               | **201**         | That language is **not** in `translations`              |
| 3 | Create with a field that is blank in an otherwise filled language | **201**       | That field is missing; the rest of the language is kept |
| 4 | PATCH something unrelated (e.g. the price / `enabled`)          | **200**         | All existing translations are still there               |
| 5 | PATCH `translations` with only `it` on a record that had `it` + `ka` | **200**     | Only `it` remains — `ka` was removed                    |
| 6 | PATCH `translations: {}`                                        | **200**         | All translations removed; English copy untouched        |
| 7 | Send `translations: { "fr": { "name": "..." } }`                | **400**         | Message about supported translation languages           |
| 8 | Send `translations: { "en": { "name": "..." } }`                | **400**         | Rejected — English belongs in the top-level fields      |
| 9 | Send a translated field longer than the limit                   | **400**         | Message about the translated field being too long       |

> **Note on the service endpoint:** `POST /service` and `PATCH /service/:id` also
> accept `multipart/form-data` (for the cover image). In that encoding
> `translations` must be sent as a **JSON string**, e.g.
> `translations={"it":{"name":"Pulizia"}}`. Every other endpoint is JSON only.
