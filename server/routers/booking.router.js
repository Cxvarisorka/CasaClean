//Module
const express = require('express');

// Controllers
const {
  getBookings,
  getMyBookings,
  getBookingById,
  createBooking,
  editBooking,
  cancelMyBooking,
  deleteBooking
} = require('../controllers/booking.controller');

// Middlewares
const { protect, restrictTo } = require("../middlewares/protect.middleware");
const validate = require('../middlewares/validate.middleware');
const { bookingLimiter } = require('../middlewares/rateLimit.middleware');

// Validations
const { createBookingSchema, editBookingSchema } = require('../validations/booking.validation');

const bookingRouter = express.Router();

// Admin-only manual/offline booking creation (walk-in / phone, paid by
// cash/invoice). Customers now book through the online payment flow
// (/api/v1/payment/booking/*), which charges the card before the booking is
// created — so this direct-create path is restricted to admins.
bookingRouter.post('/', bookingLimiter, protect, restrictTo('admin'), validate(createBookingSchema), createBooking);

// A signed-in user's own bookings. Declared BEFORE '/:id' so the literal "my"
// isn't swallowed by the dynamic id route.
bookingRouter.get('/my', protect, getMyBookings);

// A user cancels their OWN booking. Only requires auth (no admin) — ownership is
// enforced inside the controller. The '/:id/cancel' shape can't collide with the
// admin '/:id' routes (different segment count).
bookingRouter.patch('/:id/cancel', protect, cancelMyBooking);

// Admin routes
bookingRouter.get('/', protect, restrictTo('admin'), getBookings);
bookingRouter.get('/:id', protect, restrictTo('admin'), getBookingById);
bookingRouter.patch('/:id', protect, restrictTo('admin'), validate(editBookingSchema), editBooking);
bookingRouter.delete('/:id', protect, restrictTo('admin'), deleteBooking);

module.exports = bookingRouter;