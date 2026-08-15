// Modules
const { z } = require("zod");

const { MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS } = require("../utils/date.util");
const { TRANSLATABLE_FIELDS } = require("../utils/translations.util");
const { translationsSchema } = require("./translations.validation");

// Recurrence cadences an admin may pin on a service. An empty array is the
// meaningful "no restriction — the customer picks any cadence in range" value,
// so it is deliberately allowed. The max item count is the size of the range
// itself: a longer list could only contain duplicates.
const recurringIntervalDays = z
    .array(
        z
            .number()
            .int({ message: "Recurring intervals must be whole days!" })
            .min(MIN_INTERVAL_DAYS, { message: `A recurring interval can't be shorter than ${MIN_INTERVAL_DAYS} day!` })
            .max(MAX_INTERVAL_DAYS, { message: `A recurring interval can't be longer than ${MAX_INTERVAL_DAYS} days!` })
    )
    .max(MAX_INTERVAL_DAYS - MIN_INTERVAL_DAYS + 1, { message: "Too many recurring intervals!" });

// Accepted forms for the `image` field, in order:
//   1. a hosted HTTPS URL,
//   2. a path to a file this server stores and serves (the multer upload —
//      the admin panel echoes it back unchanged on a partial edit),
//   3. a legacy inline base64 data URL (pre-upload services still hold these).
// The filename character class is deliberately narrow so a stored value can
// never encode a traversal segment.
const SERVICE_IMAGE_REGEX = /^(https:\/\/[^\s]+|\/uploads\/services\/[A-Za-z0-9._-]+|data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2})$/i;
const serviceImage = z
    .string()
    .max(3_000_000, "Image is too large!")
    // "" is the explicit "no image" / "clear the image" value the admin form
    // sends; everything else must match one of the accepted forms above.
    .refine((value) => value === "" || SERVICE_IMAGE_REGEX.test(value), {
        message: "Image must be an HTTPS URL, an uploaded image path or a supported base64 image data URL!"
    });

// Per-language copy. The field list and the shared rules live in
// utils/translations.util.js.
const translations = translationsSchema(TRANSLATABLE_FIELDS.service);

// Schema for validate create service request body
const createServiceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(5, { message: "Name must contain at least 5 characters!" })
        .max(50, { message: "Name is too long!" }),
    
    subtitle: z
        .string()
        .trim()
        .max(120, "Subtitle is too long!")
        .optional(),

    description: z
        .string()
        .trim()
        .min(10, "Description must contain at least 10 characters!")
        .max(700, "Description is too long!"),

    // A hosted URL or an inline data URL — keep it permissive but bounded so a
    // runaway upload can't bloat a document.
    image: serviceImage.optional(),

    includes: z
        .array(z.string().trim().min(1).max(200))
        .max(20, "Too many inclusions!")
        .optional(),

    // Optional per-language overrides of the four text fields above.
    translations: translations.optional(),

    pricePerHour: z
        .number()
        .min(0, "Price can't be negative!"),

    allCities: z
        .boolean()
        .optional(),

    cities: z
        .array(z.string()),

    allSpecialRequests: z
        .boolean()
        .optional(),

    specialRequests: z
        .array(z.string())
        .optional(),

    // Opt-in recurring bookings. The optional cadence list is only meaningful
    // when recurringEnabled is true — the controller clears it otherwise.
    recurringEnabled: z
        .boolean()
        .optional(),

    recurringIntervalDays: recurringIntervalDays.optional()
}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit service request body
const editServiceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(5, { message: "Name must contain at least 5 characters!" })
        .max(50, { message: "Name is too long!" })
        .optional(),

    subtitle: z
        .string()
        .trim()
        .max(120, "Subtitle is too long!")
        .optional(),

    description: z
        .string()
        .trim()
        .min(10, "Description must contain at least 10 characters!")
        .max(700, "Description is too long!")
        .optional(),

    image: serviceImage.optional(),

    includes: z
        .array(z.string().trim().min(1).max(200))
        .max(20, "Too many inclusions!")
        .optional(),

    // Sent whole, not merged: the panel always posts the full set of languages,
    // so an omitted locale means "translation removed" (see the controller).
    translations: translations.optional(),

    pricePerHour: z
        .number()
        .min(0, "Price can't be negative!")
        .optional(),

    allCities: z
        .boolean()
        .optional(),

    cities: z
        .array(z.string())
        .optional(),

    allSpecialRequests: z
        .boolean()
        .optional(),

    specialRequests: z
        .array(z.string())
        .optional(),

    recurringEnabled: z
        .boolean()
        .optional(),

    recurringIntervalDays: recurringIntervalDays.optional(),

    // Soft on/off switch: a disabled service is hidden from the public site and
    // can't be booked, without deleting it. Only editable, not set on create.
    enabled: z
        .boolean()
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { createServiceSchema, editServiceSchema };
