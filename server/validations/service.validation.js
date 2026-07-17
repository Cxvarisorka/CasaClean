// Modules
const { z } = require("zod");

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
    image: z
        .string()
        .max(3_000_000, "Image is too large!")
        .optional(),

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

    image: z
        .string()
        .max(3_000_000, "Image is too large!")
        .optional(),

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