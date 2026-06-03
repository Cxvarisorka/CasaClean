import { z } from "zod";

/*
 * Contact validation
 * ------------------
 * Zod schemas are the single source of truth for both client validation and
 * the inferred shape of submitted data. Messages are user-facing, so they read
 * like guidance, not error codes.
 */

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), "Enter a valid phone number"),
  topic: z.string().min(1, "Select a topic"),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(1000, "Please keep it under 1000 characters"),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const CONTACT_TOPICS = [
  { value: "general", label: "General enquiry" },
  { value: "booking", label: "Booking a turnover" },
  { value: "pricing", label: "Pricing & plans" },
  { value: "partnership", label: "Property manager / partnership" },
  { value: "support", label: "Existing customer support" },
];
