// Modules
const { z } = require("zod");

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
        .optional()
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

    // Soft on/off switch: a disabled service is hidden from the public site and
    // can't be booked, without deleting it. Only editable, not set on create.
    enabled: z
        .boolean()
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { createServiceSchema, editServiceSchema };
