import { z } from "zod";
import { isValidPhone } from "@/lib/phone";
import { todayDateString } from "../utils/recurrence";
import {
  DURATION_STEP_HOURS,
  MAX_DURATION_HOURS,
  MAX_INTERVAL_DAYS,
  MIN_DURATION_HOURS,
} from "../constants";

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
  // Bounds mirror the duration constants / CLEANERS_RANGE in ../constants.js and
  // the server's createBookingSchema. Keep all three in step — `hours` previously
  // allowed 8 here while the UI only offered 6 and the server had no cap.
  // Half hours are bookable (1.5 = a 90-minute visit); finer steps are not, here
  // or in the server's utils/duration.util.js.
  hours: z.coerce
    .number()
    .min(MIN_DURATION_HOURS, "Select a duration")
    .max(MAX_DURATION_HOURS, "Choose a shorter booking")
    .multipleOf(DURATION_STEP_HOURS, "Choose a whole or half hour"),
  cleaners: z.coerce.number().int().min(1, "Select cleaners").max(3),
  additionalServices: z.array(z.string()).default([]),
  cleaningTools: z.array(z.string()).default([]),

  // Step 3 — schedule
  date: z
    .string()
    .min(1, "Pick a date")
    .refine((v) => v >= todayISO(), "Choose a future date"),
  // The customer types the arrival time, to the minute, so the FORMAT is checked
  // here. Whether that minute fits the chosen city's working hours needs the city
  // and the duration, which a flat field schema can't see — ScheduleStep applies
  // that rule (utils/timeWindow.js) and the server enforces it.
  time: z
    .string()
    .min(1, "Pick a start time")
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:MM"),
  // 0 is the one-time sentinel; anything above it is a repeat cadence in days.
  // The upper bound mirrors the server's; whether the chosen service allows that
  // exact cadence is a per-service rule ScheduleStep applies (recurrenceChoices)
  // and the server enforces.
  intervalDays: z.coerce.number().int().min(0).max(MAX_INTERVAL_DAYS).default(0),

  // Step 4 — contact
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  // Required here even though it is optional on the account: this is the number
  // the crew rings at the door, and the API refuses a booking without one
  // (server/services/booking.service.js).
  phone: z
    .string()
    .trim()
    .refine(isValidPhone, "Enter a valid phone number, including the country prefix"),
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
