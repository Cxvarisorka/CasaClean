// Modules
const { z } = require("zod");

const { TRANSLATABLE_FIELDS } = require("../utils/translations.util");
const { translationsSchema } = require("./translations.validation");

// Per-language copy. The field list and the shared rules live in
// utils/translations.util.js.
const translations = translationsSchema(TRANSLATABLE_FIELDS.city);

// Schema for validate add city request body
const addCitySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: "Name must contain at least 1 characters!" })
        .max(40, { message: "Name is too long!" }),

    // Optional per-language versions of the name above.
    translations: translations.optional(),

    workingHourStarts: z
        .string()
        .trim(),
    
    workingHourEnds: z
        .string()
        .trim(),
    
}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit city request body
const editCitySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: "Name must contain at least 1 characters!" })
        .max(40, { message: "Fullname is too long!" })
        .optional(),

    // Sent whole, not merged: the panel always posts the full set of languages,
    // so an omitted locale means "translation removed" (see the controller).
    translations: translations.optional(),

    workingHourStarts: z
        .string()
        .trim()
        .optional(),
    
    workingHourEnds: z
        .string()
        .trim()
        .optional(),

    enabled: z
        .boolean()
        .optional()
    
}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { addCitySchema, editCitySchema };