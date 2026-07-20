const { z } = require("zod");
const { createBookingSchema } = require("./booking.validation");
const { ALLOWED_INTERVAL_DAYS } = require('../utils/date.util');

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
        intervalDays: z
            .number()
            .int()
            .refine((value) => ALLOWED_INTERVAL_DAYS.includes(value), {
                message: `intervalDays must be one of: ${ALLOWED_INTERVAL_DAYS.join(', ')}`
            })
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
