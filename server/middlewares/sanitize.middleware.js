/**
 * NoSQL-injection hardening (defense in depth).
 *
 * `express.json()` happily parses bodies like `{ "email": { "$ne": null } }`.
 * If such an object ever reaches a Mongoose query it becomes an operator
 * injection. Primary defense is per-route Zod validation; this middleware is
 * the safety net for any endpoint that slips through: it strips every object
 * key that starts with `$` or contains `.` from req.body and req.params.
 *
 * (Hand-rolled rather than `express-mongo-sanitize` because that package
 * assigns to req.query, which is a read-only getter in Express 5.)
 *
 * ⚠ req.query is NOT covered here (same read-only-getter reason). Query params
 * must never be passed into a Mongo filter raw — coerce them at the point of
 * use (every current endpoint casts them to bounded Numbers or compares them
 * as literal strings, e.g. `req.query.includeDisabled === "true"`). Any future
 * endpoint that filters by a query param must do the same.
 */
const sanitizeValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === "object") {
        const clean = {};
        for (const [key, val] of Object.entries(value)) {
            if (key.startsWith("$") || key.includes(".")) continue;
            clean[key] = sanitizeValue(val);
        }
        return clean;
    }
    return value;
};

const sanitizeMongo = (req, res, next) => {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.params) req.params = sanitizeValue(req.params);
    next();
};

module.exports = sanitizeMongo;
