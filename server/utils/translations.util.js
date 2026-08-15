/**
 * Multilingual content — the shared contract.
 *
 * Four catalogue resources carry customer-facing copy that has to exist in every
 * language the site offers (see locale.util.js). They all use the same shape:
 *
 *   - the root fields hold the DEFAULT locale. They stay required, uniquely
 *     indexed and are what every non-localized consumer reads (booking records,
 *     the admin tables, service slugs).
 *   - `translations.<locale>` holds an optional override per other language,
 *     field by field. A field a translation doesn't fill falls back to the root
 *     value when the site renders, so a half-translated record is a normal,
 *     valid state — that is what lets the admin panel walk the languages one at
 *     a time instead of demanding all of them at once.
 *
 * This module owns the field lists; models, Zod schemas and controllers all
 * build from them, so adding a translatable field is a single edit here plus the
 * matching root field on the model.
 *
 *   { name, max }                     -> a text field, capped at `max` chars
 *   { name, list: true, max, maxItems } -> a list of short strings
 */

// `max` mirrors the limit on the corresponding root field so a translation can
// never outgrow what the design was built to show. Where the root field has no
// limit of its own (the add-on/tool descriptions), the cap is deliberately
// generous: a translation must never be impossible to finish because the
// original was long.
const TRANSLATABLE_FIELDS = {
    service: [
        { name: "name", max: 50 },
        { name: "subtitle", max: 120 },
        { name: "description", max: 700 },
        { name: "includes", list: true, max: 200, maxItems: 20 }
    ],
    city: [
        { name: "name", max: 40 }
    ],
    specialRequest: [
        { name: "name", max: 60 },
        { name: "description", max: 2000 }
    ],
    cleaningTool: [
        { name: "name", max: 60 },
        { name: "description", max: 2000 }
    ]
};

/**
 * Clean a `translations` map before it is stored.
 *
 * The admin panel steps through the languages one at a time and posts the whole
 * set on every save, so most entries arrive partially (or entirely) blank. Blank
 * is not a value — it means "not translated yet", and the site falls back to the
 * default locale. Storing those blanks would make a translation look present
 * when it isn't, so every blank string, blank list item and empty locale entry
 * is dropped.
 *
 * Returns undefined when the client sent nothing, so callers can tell "no
 * translations field in this request" (leave them alone) from "translations
 * cleared" (an empty map).
 */
const normalizeTranslations = (translations, fields) => {
    if (translations === undefined || translations === null) return undefined;

    const cleaned = {};

    for (const [locale, entry] of Object.entries(translations)) {
        if (!entry || typeof entry !== "object") continue;

        const next = {};

        for (const field of fields) {
            const value = entry[field.name];

            if (field.list) {
                const items = Array.isArray(value)
                    ? value.map((item) => String(item).trim()).filter(Boolean)
                    : [];
                if (items.length) next[field.name] = items;
                continue;
            }

            const text = typeof value === "string" ? value.trim() : "";
            if (text) next[field.name] = text;
        }

        // An entry with no filled field is the same as no entry at all.
        if (Object.keys(next).length) cleaned[locale] = next;
    }

    return cleaned;
};

module.exports = { TRANSLATABLE_FIELDS, normalizeTranslations };
