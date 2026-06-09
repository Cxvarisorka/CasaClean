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

module.exports = { signupSchema, signinSchema, resendEmailVerificationSchema };