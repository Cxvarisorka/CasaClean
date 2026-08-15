// Modules
const { z } = require("zod");

// Email is optional on a worker. We accept either a valid email OR an empty
// string (the admin form sends "" to clear a previously stored address); the
// controller normalises "" to null before persisting.
const optionalEmail = z
    .union([
        z.string().trim().toLowerCase().email({ message: "Worker email must be a valid email address!" }),
        z.literal("")
    ])
    .optional();

// Phone has no strict format (international numbers vary); just bound the length.
// Empty string is allowed and treated as "no phone" by the controller.
const optionalPhone = z
    .string()
    .trim()
    .max(30, { message: "Phone number is too long!" })
    .optional();

// Schema to validate the add-worker request body
const addWorkerSchema = z.object({
    fullname: z
        .string()
        .trim()
        .min(1, { message: "Full name must contain at least 1 character!" })
        .max(80, { message: "Full name is too long!" }),

    email: optionalEmail,

    phone: optionalPhone,

}).strict({ message: "Unknown fields are not allowed!" });

// Schema to validate the edit-worker request body (every field optional)
const editWorkerSchema = z.object({
    fullname: z
        .string()
        .trim()
        .min(1, { message: "Full name must contain at least 1 character!" })
        .max(80, { message: "Full name is too long!" })
        .optional(),

    email: optionalEmail,

    phone: optionalPhone,

    enabled: z
        .boolean()
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { addWorkerSchema, editWorkerSchema };
