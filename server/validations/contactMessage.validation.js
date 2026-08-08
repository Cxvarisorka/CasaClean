const { z } = require("zod");

const { CONTACT_TOPICS, CONTACT_STATUSES } = require("../utils/contact.util");

// Mirrors client/src/features/contact/validation/contactSchema.js field for
// field — same lengths, same phone pattern — so a submission the browser
// accepted is never rejected here for a different reason.
const createContactMessageSchema = z.object({
    name: z.string().trim()
        .min(2, { message: "Please enter your full name" })
        .max(80, { message: "Name is too long!" }),
    email: z.string().trim().toLowerCase()
        .email({ message: "Enter a valid email address" }),
    phone: z.string().trim()
        .optional()
        .refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), { message: "Enter a valid phone number" }),
    topic: z.enum(CONTACT_TOPICS, { message: "Select a topic" }),
    message: z.string().trim()
        .min(10, { message: "Tell us a little more (at least 10 characters)" })
        .max(1000, { message: "Please keep it under 1000 characters" }),
    // Honeypot. Real browsers leave this hidden field empty; bots fill every
    // input they find. It has to be DECLARED because the schema is .strict() —
    // otherwise an unknown-field 400 would tell the bot exactly what tripped it.
    // A non-empty value is dropped silently in the controller instead.
    website: z.string().trim().max(200).optional()
}).strict({ message: "Unknown fields are not allowed!" });

// The only field the admin panel may write: a message is customer-authored, so
// the panel triages it rather than editing it.
const updateContactMessageSchema = z.object({
    status: z.enum(CONTACT_STATUSES, { message: "Unknown status." })
}).strict({ message: "Unknown fields are not allowed!" });

// The answer an admin types in the panel. Only the body — everything else about
// the outgoing email (recipient, subject, quoted original) is derived from the
// stored message, so a request can't redirect a reply at somebody else.
const replyContactMessageSchema = z.object({
    body: z.string().trim()
        .min(10, { message: "Write a little more before sending." })
        .max(5000, { message: "Reply is too long!" })
}).strict({ message: "Unknown fields are not allowed!" });

module.exports = {
    createContactMessageSchema,
    updateContactMessageSchema,
    replyContactMessageSchema
};
