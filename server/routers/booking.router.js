//Module
const express = require('express');

// Controllers
const {
  getBookings,
  getMyBookings,
  getBookingById,
  createBooking,
  editBooking,
  deleteBooking
} = require('../controllers/booking.controller');

// Middlewares
const { protect, restrictTo } = require("../middlewares/protect.middleware");
const validate = require('../middlewares/validate.middleware');

// Validations
const { createBookingSchema, editBookingSchema } = require('../validations/booking.validation');

const bookingRouter = express.Router();

// Authenticated route — a user must be logged in to book. `protect` populates
// req.user, whose stored profile (name/email/phone) the controller reuses so the
// customer doesn't re-enter details they already gave at registration.
bookingRouter.post('/', protect, validate(createBookingSchema), createBooking);

// A signed-in user's own bookings. Declared BEFORE '/:id' so the literal "my"
// isn't swallowed by the dynamic id route.
bookingRouter.get('/my', protect, getMyBookings);

// Admin routes
bookingRouter.get('/', protect, restrictTo('admin'), getBookings);
bookingRouter.get('/:id', protect, restrictTo('admin'), getBookingById);
bookingRouter.patch('/:id', protect, restrictTo('admin'), validate(editBookingSchema), editBooking);
bookingRouter.delete('/:id', protect, restrictTo('admin'), deleteBooking);

module.exports = bookingRouter;