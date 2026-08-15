/*
 * Phone numbers
 * -------------
 * One place that decides what a phone number IS, so the Mongoose validator, the
 * Zod schemas and the booking guard can't drift apart.
 *
 * A number is stored in international form — a "+" followed by the country's
 * dial code and the national number, digits only ("+393312345678"). The product
 * sells in Georgia, Italy and the rest of Europe, so a bare "3312345678" is
 * genuinely ambiguous: it is a mobile in three countries at once. The client
 * renders a country picker in front of the field (client/src/lib/phone.js) and
 * always submits the prefix, which is also what makes the unique index on
 * User.phone mean something — two spellings of the same number normalise to one
 * string instead of taking two accounts.
 *
 * Nothing here validates the number against a country's numbering plan. That
 * needs a library and a data file that goes stale; the length bounds are the
 * ITU E.164 ones and reject the mistakes that matter (empty, letters, a number
 * typed without its prefix).
 */

// E.164: "+", a non-zero country digit, then 7–15 digits in total.
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Reduce a typed number to the canonical stored form.
 *
 * Strips the punctuation people type between groups ("+39 331 234-5678") and
 * rewrites the "00" international prefix as "+", so the two ways of writing the
 * same number reach the database — and the unique index — as one value.
 *
 * @param {unknown} value raw input, any type (non-strings become "")
 * @returns {string} the normalised number, or "" when there is nothing to store
 */
const normalizePhone = (value) => {
    if (typeof value !== "string") return "";

    // Spaces, brackets, dots and every dash a keyboard or a paste can produce
    // (ASCII hyphen, the U+2010–U+2015 dashes, the U+2212 minus sign).
    const compact = value.replace(/[\s().‐-―−-]/g, "");

    return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
};

/**
 * @param {unknown} value raw or normalised input
 * @returns {boolean} true when the value is a storable international number
 */
const isValidPhone = (value) => PHONE_REGEX.test(normalizePhone(value));

// The one wording every surface uses, so a rejected number always explains the
// same rule (and always shows the prefix it is asking for).
const PHONE_ERROR_MESSAGE =
    "Enter a valid phone number including the country prefix, e.g. +39 331 234 5678!";

module.exports = {
    PHONE_REGEX,
    PHONE_ERROR_MESSAGE,
    normalizePhone,
    isValidPhone
};
