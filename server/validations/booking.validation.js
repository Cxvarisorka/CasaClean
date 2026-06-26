// Modules
const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z
    .string()
    .trim()
    .refine((id) => mongoose.Types.ObjectId.isValid(id), { message: "Invalid ID" })

// HH:MM 24-hour clock — same pattern used in city.model.js
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// YYYY-MM-DD calendar date
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Same-day bookings are allowed; only past dates are rejected. We compare
// calendar dates at LOCAL midnight (never raw `new Date("YYYY-MM-DD")`, which is
// parsed as UTC midnight and shifts by timezone) so "today" is always valid.
const isTodayOrFuture = (val) => {
  const [y, m, d] = val.split("-").map(Number);
  const booking = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return booking >= today;
};

// Schema for validate create booking request body
const createBookingSchema = z.object({
    serviceId: objectId,

    cityId: objectId,

    // Customer identity. For a normal user these are IGNORED by the controller and
    // always taken from req.user (a user can't book under someone else's name).
    // They are only honoured for an ADMIN booking on a customer's behalf, alongside
    // the optional `userId` that links the booking to a registered account. Being
    // optional here, a regular user supplying them is harmless — the controller
    // never reads them for non-admins.
    customerName: z
        .string()
        .trim()
        .min(1, { message: "Customer name can't be empty!" })
        .optional(),

    customerEmail: z
        .string()
        .trim()
        .toLowerCase()
        .email({ message: "Customer email must be a valid email address!" })
        .optional(),

    // Optional registered account to attach the booking to (admin-on-behalf).
    userId: objectId.optional(),

    // customerPhone falls back to req.user.phone but may be overridden.
    customerPhone: z
        .string()
        .trim()
        .min(1, { message: "Customer phone can't be empty!" })
        .optional(),

    streetName: z
        .string()
        .trim()
        .min(1, { message: "Street name is required!" }),

    houseNumber: z
        .string()
        .trim()
        .min(1, { message: "The house number must be greater then 0!" }),

    propertySize: z
        .string()
        .trim()
        .min(1, { message: "The property size must be greater then 0!" }),

    bookingDate: z
        .string()
        .trim()
        .regex(DATE_REGEX, { message: "bookingDate must be in YYYY-MM-DD format!" })
        .refine(isTodayOrFuture, {
            message: "Booking date can't be in the past!"
        }),

    bookingTime: z
        .string()
        .trim()
        .regex(TIME_REGEX, { message: "bookingTime must be in HH:MM (24-hour) format!" }),

    doorbellName: z
        .string()
        .trim()
        .min(1, { message: "Doorbell name can't be empty!" }),

    hours: z
        .number()
        .int({ message: "Hours must be a whole number!" })
        .min(1, { message: "A booking must be at least 1 hour!" }),

    cleaners: z
        .number()
        .int({ message: "Cleaners must be a whole number!" })
        .min(1, { message: "A booking must have at least 1 cleaner!" }),

    // totalAmount is now server-managed (computed from service.pricePerHour * hours
    // + sum of specialRequest prices). It is intentionally absent from this schema
    // so the Zod .strict() guard rejects any client-supplied value.

    notes: z
        .string()
        .trim()
        .max(2000, { message: "Notes can't exceed 2000 characters!" })
        .optional()
        .nullable(),

    specialRequests: z
        .array(objectId)
        .optional(),

    // Assigned cleaning staff. Honoured by the controller only for admin
    // requests (a normal customer can't assign workers to their own booking).
    workers: z
        .array(objectId)
        .max(50, { message: "Workers list can't exceed 50 items!" })
        .optional(),

    supplies: z
        .array(
            z.string()
            .trim()
            .min(1, { message: "Supply name can't be empty!" })
            .max(100, { message: "Supply name can't exceed 100 characters!" })
        )
        .max(50, { message: "Supplies list can't exceed 50 items!" })
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit booking request body
const editBookingSchema = z.object({
    serviceId: objectId.optional(),

    cityId: objectId.optional(),

    customerPhone: z
        .string()
        .trim()
        .min(1, { message: "Customer phone can't be empty!" })
        .optional(),

    streetName: z
        .string()
        .trim()
        .min(1, { message: "Street name is required!" })
        .optional(),

    houseNumber: z
        .string()
        .trim()
        .min(1, { message: "The house number must be greater then 0!" })
        .optional(),

    propertySize: z
        .string()
        .trim()
        .min(1, { message: "The property size must be greater then 0!" })
        .optional(),

    bookingDate: z
        .string()
        .trim()
        .regex(DATE_REGEX, { message: "bookingDate must be in YYYY-MM-DD format!" })
        .refine(isTodayOrFuture, {
            message: "Booking date can't be in the past!"
        })
        .optional(),

    bookingTime: z
        .string()
        .trim()
        .regex(TIME_REGEX, { message: "bookingTime must be in HH:MM (24-hour) format!" })
        .optional(),

    doorbellName: z
        .string()
        .trim()
        .min(1, { message: "Doorbell name can't be empty!" })
        .optional(),

    hours: z
        .number()
        .int({ message: "Hours must be a whole number!" })
        .min(1, { message: "A booking must be at least 1 hour!" })
        .optional(),

    cleaners: z
        .number()
        .int({ message: "Cleaners must be a whole number!" })
        .min(1, { message: "A booking must have at least 1 cleaner!" })
        .optional(),

    // totalAmount is server-managed — intentionally absent from editBookingSchema
    // as well. An admin editing a booking should not be able to override the
    // computed price without going through the proper recalculation path.

    status: z
        .enum(['pending', 'confirmed', 'cancelled', 'completed'])
        .optional(),

    notes: z
        .string()
        .trim()
        .max(2000, { message: "Notes can't exceed 2000 characters!" })
        .optional()
        .nullable(),

    specialRequests: z
        .array(objectId)
        .optional(),

    // Assigned cleaning staff (admin-managed). Sending an empty array clears the
    // current assignment.
    workers: z
        .array(objectId)
        .max(50, { message: "Workers list can't exceed 50 items!" })
        .optional(),

    supplies: z
        .array(
            z.string()
            .trim()
            .min(1, { message: "Supply name can't be empty!" })
            .max(100, { message: "Supply name can't exceed 100 characters!" })
        )
        .max(50, { message: "Supplies list can't exceed 50 items!" })
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { createBookingSchema, editBookingSchema };
