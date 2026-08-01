import { z } from "zod";
import { todayDateString } from "../utils/recurrence";
import { MAX_INTERVAL_DAYS } from "../constants";

/*
 * Booking validation
 * ------------------
 * One schema describing the entire booking. The wizard validates a subset of
 * fields per step (see BOOKING_STEPS.fields), but a single schema keeps the
 * rules in one place and gives us a fully-typed payload at submission.
 */

const todayISO = () => todayDateString();

export const bookingSchema = z.object({
  // Step 1 — property
  cityId: z.string().min(1, "Select a city"),
  street: z.string().trim().min(2, "Enter the street name"),
  houseNumber: z.string().trim().min(1, "Enter the house number"),
  propertySize: z
    .string()
    .min(1, "Enter the property size")
    .refine((v) => Number(v) > 0, "Size must be greater than 0"),
  doorbellName: z.string().trim().min(1, "Enter the name on the doorbell"),

  // Step 2 — preferences
  serviceId: z.string().min(1, "Choose a service"),
  // Bounds mirror HOURS_RANGE / CLEANERS_RANGE in ../constants.js and the
  // server's createBookingSchema. Keep all three in step — `hours` previously
  // allowed 8 here while the UI only offered 6 and the server had no cap.
  hours: z.coerce.number().int().min(1, "Select hours").max(6),
  cleaners: z.coerce.number().int().min(1, "Select cleaners").max(3),
  additionalServices: z.array(z.string()).default([]),
  cleaningTools: z.array(z.string()).default([]),

  // Step 3 — schedule
  date: z
    .string()
    .min(1, "Pick a date")
    .refine((v) => v >= todayISO(), "Choose a future date"),
  time: z.string().min(1, "Pick a time slot"),
  // 0 is the one-time sentinel; anything above it is a repeat cadence in days.
  // The upper bound mirrors the server's; whether the chosen service allows that
  // exact cadence is a per-service rule ScheduleStep applies (recurrenceChoices)
  // and the server enforces.
  intervalDays: z.coerce.number().int().min(0).max(MAX_INTERVAL_DAYS).default(0),

  // Step 4 — contact
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,}$/, "Enter a valid phone number"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
});

export const bookingDefaults = {
  cityId: "",
  street: "",
  houseNumber: "",
  propertySize: "",
  doorbellName: "",
  serviceId: "",
  hours: 2,
  cleaners: 1,
  additionalServices: [],
  cleaningTools: [],
  date: "",
  time: "",
  intervalDays: 0,
  name: "",
  email: "",
  phone: "",
  notes: "",
};
