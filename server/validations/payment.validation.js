const { z } = require("zod");
const { createBookingSchema } = require("./booking.validation");
const { MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS } = require('../utils/date.util');

// Booking payment-intent body = the full booking payload (re-validated by the
// same rules as the create endpoint) PLUS two optional payment options:
//   - savePaymentMethod: store this card on the customer for future bookings
//   - savedPaymentMethodId: pay with a previously-saved card ("pm_..."), charged
//     off-session and confirmed server-side.
// .strict() still rejects any other unknown field (notably totalAmount, which is
// always computed server-side).
const bookingIntentSchema = createBookingSchema
    .extend({
        savePaymentMethod: z.boolean().optional(),
        savedPaymentMethodId: z
            .string()
            .trim()
            .min(1, { message: "savedPaymentMethodId can't be empty!" })
            .optional(),
        // Omitted for a one-off booking. A recurring first cycle is still an
        // on-session payment, but must establish an off-session card mandate.
        //
        // These are only the platform-wide bounds. Whether the CHOSEN service
        // repeats at all — and whether it pins a narrower cadence list — is a
        // per-service rule the schema can't see; buildValidatedBookingDraft
        // enforces it against the resolved service (assertRecurrenceAllowed).
        intervalDays: z
            .number()
            .int({ message: "intervalDays must be a whole number of days!" })
            .min(MIN_INTERVAL_DAYS, { message: `A booking can repeat at most once every ${MIN_INTERVAL_DAYS} day!` })
            .max(MAX_INTERVAL_DAYS, { message: `A booking can repeat at least once every ${MAX_INTERVAL_DAYS} days!` })
            .optional()
    })
    .strict({ message: "Unknown fields are not allowed!" });

// Finalize body — just the PaymentIntent to promote into a real booking.
const finalizeBookingSchema = z
    .object({
        paymentIntentId: z
            .string()
            .trim()
            .min(1, { message: "paymentIntentId is required!" })
    })
    .strict({ message: "Unknown fields are not allowed!" });

module.exports = { bookingIntentSchema, finalizeBookingSchema };
