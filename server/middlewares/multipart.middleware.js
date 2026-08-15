/**
 * Multipart body coercion.
 *
 * `multipart/form-data` has no type system — every field arrives as a string,
 * so `pricePerHour: 19.9` becomes `"19.9"` and `allCities: true` becomes
 * `"true"`. Rather than fork every Zod schema into a lenient multipart variant,
 * this middleware narrowly re-types the handful of non-string fields *after*
 * multer has parsed the body and *before* `validate(schema)` runs, so the same
 * strict schema validates JSON and multipart requests identically.
 *
 * It deliberately does NOT coerce blindly: a value that can't be re-typed is
 * left as-is so Zod produces the normal field-level error instead of the
 * middleware silently inventing `NaN` or `false`.
 *
 * Requests that aren't multipart pass through untouched.
 */

/** "true"/"false" (case-insensitive) → boolean; anything else is left alone. */
const toBoolean = (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return value;
};

/** Non-blank numeric string → number. Blank stays blank (Number("") is 0). */
const toNumber = (value) => {
    if (typeof value !== "string" || value.trim() === "") return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
};

/**
 * Arrays are sent as a JSON string (the client JSON-encodes them) so empty
 * arrays survive the round trip — a repeated-field encoding can't express `[]`.
 * A field multer already collected into an array (repeated keys) is kept.
 */
const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (trimmed === "") return [];
    if (!trimmed.startsWith("[")) return value;

    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : value;
    } catch {
        return value;
    }
};

/**
 * Nested structures (e.g. the per-language `translations` map) are sent as a
 * JSON string for the same reason arrays are — multipart has no way to express
 * an object, and `{}` has to survive the round trip so "all translations
 * removed" reaches the controller as an empty map rather than a missing field.
 */
const toObject = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (trimmed === "") return {};
    if (!trimmed.startsWith("{")) return value;

    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : value;
    } catch {
        return value;
    }
};

/**
 * Build a middleware that re-types the named fields on multipart requests.
 *
 *   coerceMultipart({ numbers: ["pricePerHour"], booleans: ["allCities"] })
 */
const coerceMultipart = ({ numbers = [], booleans = [], arrays = [], objects = [] } = {}) => {
    const conversions = [
        [numbers, toNumber],
        [booleans, toBoolean],
        [arrays, toArray],
        [objects, toObject]
    ];

    return (req, res, next) => {
        if (!req.is("multipart/form-data") || !req.body) return next();

        for (const [fields, convert] of conversions) {
            for (const field of fields) {
                // Only touch fields the client actually sent, so an absent
                // optional field stays absent (partial PATCH semantics).
                if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                    req.body[field] = convert(req.body[field]);
                }
            }
        }

        next();
    };
};

module.exports = coerceMultipart;
