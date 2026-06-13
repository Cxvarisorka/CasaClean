// Modules
const { z } = require("zod");

// Schema for validate register request body
const signupSchema = z.object({
    fullname: z
        .string()
        .trim()
        .min(5, { message: "Fullname must contain at least 5 characters!" })
        .max(50, { message: "Fullname is too long!" }),

    email: z
        .string()
        .trim()
        .email({ message: "Invalid email address!" }),

    phone: z
        .string()
        .trim(),

    password: z
        .string()
        .trim()
        .min(8, { message: "Password must contain at least 8 characters!" })
        .max(50, { message: "Password is too long!" })

}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate login request body
const signinSchema = z.object({
    email: z
        .string()
        .trim()
        .email({ message: "Invalid email address!" }),

    password: z
        .string()
        .trim()
        .min(1, { message: "Password must contain at least 1 character!" })
        .max(50, { message: "Password is too long!" }),

    // Optional: the client sends this to choose a persistent vs. session-only
    // cookie. The schema is .strict(), so it must be allowed explicitly or the
    // whole request is rejected ("Validation failed!").
    remember: z
        .boolean()
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate resend email verification request body
const resendEmailVerificationSchema = z.object({
    email: z
        .string()
        .trim()
        .email({ message: "Invalid email adress!" })

}).strict({ message: "Unknown fields are not allowed!" })

// Admin: POST /auth/users. Mirrors signupSchema (every value must be a plain
// string — rejecting objects also blocks NoSQL operator injection like
// `email: { "$ne": null }`) plus the admin-only role/isVerified flags.
const createUserSchema = z.object({
    fullname: z
        .string()
        .trim()
        .min(5, { message: "Fullname must contain at least 5 characters!" })
        .max(50, { message: "Fullname is too long!" }),

    email: z
        .string()
        .trim()
        .email({ message: "Invalid email address!" }),

    phone: z
        .string()
        .trim()
        .min(1, { message: "Phone is required!" }),

    password: z
        .string()
        .trim()
        .min(8, { message: "Password must contain at least 8 characters!" })
        .max(50, { message: "Password is too long!" }),

    role: z
        .enum(["user", "admin"])
        .optional(),

    isVerified: z
        .boolean()
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

// Admin: PATCH /auth/users/:id — same fields, all optional (partial update).
const updateUserSchema = createUserSchema.partial()
    .strict({ message: "Unknown fields are not allowed!" });

module.exports = { signupSchema, signinSchema, resendEmailVerificationSchema, createUserSchema, updateUserSchema };