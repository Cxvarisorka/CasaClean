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
        .trim()
        .min(7, { message: "Phone number must contain at least 7 characters!" })
        .max(20, { message: "Phone number is too long!" })
        .regex(/^[0-9+\s-]+$/, { message: "Phone number may only contain digits, spaces, plus signs and dashes!" }),

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

// POST /auth/forgot-password — just the account email.
const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .email({ message: "Invalid email address!" })

}).strict({ message: "Unknown fields are not allowed!" });

// POST /auth/reset-password/:token — the new password (token travels in the URL).
const resetPasswordSchema = z.object({
    password: z
        .string()
        .trim()
        .min(8, { message: "Password must contain at least 8 characters!" })
        .max(50, { message: "Password is too long!" })

}).strict({ message: "Unknown fields are not allowed!" });

// PATCH /auth/me — a user edits their own profile. Email changes are
// deliberately NOT supported here (they'd need a re-verification flow); role
// and isVerified are server-managed and rejected by .strict().
const updateMeSchema = z.object({
    fullname: z
        .string()
        .trim()
        .min(5, { message: "Fullname must contain at least 5 characters!" })
        .max(50, { message: "Fullname is too long!" })
        .optional(),

    phone: z
        .string()
        .trim()
        .min(1, { message: "Phone can't be empty!" })
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

// PATCH /auth/me/password — change own password (requires the current one).
const updateMyPasswordSchema = z.object({
    currentPassword: z
        .string()
        .trim()
        .min(1, { message: "Current password is required!" })
        .max(50, { message: "Password is too long!" }),

    newPassword: z
        .string()
        .trim()
        .min(8, { message: "Password must contain at least 8 characters!" })
        .max(50, { message: "Password is too long!" })

}).strict({ message: "Unknown fields are not allowed!" });

// DELETE /auth/me — password confirmation for local accounts (Google accounts
// have no local password and may omit it).
const deleteMeSchema = z.object({
    password: z
        .string()
        .trim()
        .max(50, { message: "Password is too long!" })
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = {
    signupSchema,
    signinSchema,
    resendEmailVerificationSchema,
    createUserSchema,
    updateUserSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateMeSchema,
    updateMyPasswordSchema,
    deleteMeSchema
};
