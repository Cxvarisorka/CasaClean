// Module
const express = require('express');

// Controllers
const {
  createBookingIntent,
  finalizeBooking,
  listPaymentMethods,
  createSetupIntent,
  deletePaymentMethod
} = require('../controllers/payment.controller');

// Middlewares
const { protect } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');
const { paymentLimiter } = require('../middlewares/rateLimit.middleware');

// Validations
const { bookingIntentSchema, finalizeBookingSchema } = require('../validations/payment.validation');

const paymentRouter = express.Router();

// All payment routes require a signed-in user. CSRF (X-Requested-With) and the
// auth cookie apply normally — these are first-party SPA calls, unlike the
// Stripe webhook which is mounted separately in app.js with a raw body parser.

// Create a PaymentIntent for a booking (server validates + prices the booking).
paymentRouter.post('/booking/intent', paymentLimiter, protect, validate(bookingIntentSchema), createBookingIntent);

// Promote a paid intent into a real booking (instant path; webhook is backstop).
paymentRouter.post('/booking/finalize', protect, validate(finalizeBookingSchema), finalizeBooking);

// Saved cards.
paymentRouter.get('/methods', protect, listPaymentMethods);
paymentRouter.post('/methods/setup-intent', paymentLimiter, protect, createSetupIntent);
paymentRouter.delete('/methods/:id', protect, deletePaymentMethod);

module.exports = paymentRouter;
