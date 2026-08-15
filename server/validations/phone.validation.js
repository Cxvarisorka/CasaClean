// Modules
const { z } = require("zod");

const { normalizePhone, isValidPhone, PHONE_ERROR_MESSAGE } = require("../utils/phone.util");

/*
 * The one Zod description of a phone number, so account fields and booking
 * fields accept exactly the same thing (utils/phone.util.js owns the rule
 * itself, and the Mongoose validator reads it too).
 *
 * Every schema built here NORMALISES: what reaches the controller — and so the
 * uniqueness lookups and the stored document — is the canonical "+39331234567",
 * whichever way the customer spaced it.
 */

/**
 * Build the phone field.
 *
 * @param {object} [options]
 * @param {boolean} [options.allowEmpty=false] accept "" as a deliberate
 *   *clearing* of a stored number (profile edits) rather than as a mistake.
 *   Off by default: on a field that is sent at all, a blank is a bug.
 * @returns {import("zod").ZodType} a schema producing a normalised number
 */
const phoneField = ({ allowEmpty = false } = {}) =>
    z
        .string()
        .trim()
        // Bound the RAW string before normalising: 15 digits plus the prefix and
        // whatever grouping the customer typed still fits comfortably.
        .max(32, { message: "Phone number is too long!" })
        .transform(normalizePhone)
        .refine((value) => (allowEmpty && value === "") || isValidPhone(value), {
            message: PHONE_ERROR_MESSAGE
        });

module.exports = { phoneField };
