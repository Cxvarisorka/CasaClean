import { z } from "zod";

/*
 * Contact validation
 * ------------------
 * Zod schemas are the single source of truth for both client validation and
 * the inferred shape of submitted data. Messages are i18n KEYS, not sentences:
 * the form resolves them with t() at render time so an error reads in the
 * visitor's language. translate() returns the key itself when a locale is
 * missing the string, so a forgotten translation degrades visibly, never blankly.
 *
 * Field rules mirror server/validations/contactMessage.validation.js exactly —
 * anything accepted here must be accepted there.
 */

export const contactSchema = z.object({
  name: z.string().trim().min(2, "pages.contact.errors.name"),
  email: z.string().trim().email("pages.contact.errors.email"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), "pages.contact.errors.phone"),
  topic: z.string().min(1, "pages.contact.errors.topic"),
  message: z
    .string()
    .trim()
    .min(10, "pages.contact.errors.messageShort")
    .max(1000, "pages.contact.errors.messageLong"),
  // Honeypot: a hidden field real people never see and never fill. Not
  // validated here on purpose — the server decides silently, so a bot gets a
  // normal-looking success instead of a hint about which field gave it away.
  website: z.string().optional(),
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
