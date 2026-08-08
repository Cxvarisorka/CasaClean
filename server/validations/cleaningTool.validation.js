// Modules
const { z } = require("zod");

const { TRANSLATABLE_FIELDS } = require("../utils/translations.util");
const { translationsSchema } = require("./translations.validation");
const mongoose = require("mongoose");

const objectId = z
    .string()
    .trim()
    .refine((id) => mongoose.Types.ObjectId.isValid(id), { message: "Invalid ID" });

// Per-language copy. The field list and the shared rules live in
// utils/translations.util.js.
const translations = translationsSchema(TRANSLATABLE_FIELDS.cleaningTool);

// Schema for validate add cleaning tool body
const addCleaningToolSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: "Name must contain at least 1 characters!" })
        .max(60, { message: "Name is too long!" }),

    description: z
        .string()
        .trim()
        .optional(),

    // Optional per-language versions of the name/description above.
    translations: translations.optional(),

    // Services the tool can be used on; empty/omitted = all services.
    services: z
        .array(objectId)
        .optional(),

    price: z
        .number()
        .min(0, { message: "Price can't be negative!" })

}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit cleaning tool body
const editCleaningToolSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: "Name must contain at least 1 characters!" })
        .max(60, { message: "Name is too long!" })
        .optional(),

    description: z
        .string()
        .trim()
        .optional(),

    // Sent whole, not merged: the panel always posts the full set of languages,
    // so an omitted locale means "translation removed" (see the controller).
    translations: translations.optional(),

    services: z
        .array(objectId)
        .optional(),

    enabled: z
        .boolean()
        .optional(),

    price: z
        .number()
        .min(0, { message: "Price can't be negative!" })
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { addCleaningToolSchema, editCleaningToolSchema };
