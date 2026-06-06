//Module
const express = require('express');

// Controllers
const { 
  getBookings, 
  getBookingById, 
  createBooking, 
  editBooking, 
  deleteBooking 
} = require('../controllers/booking.controller');

// Middlewares
const { protect, restrictTo } = require("../middlewares/protect.middleware");

const bookingRouter = express.Router();

// Public route
bookingRouter.post('/', createBooking);

// Admin routes 
bookingRouter.get('/', protect, restrictTo('admin'), getBookings);
bookingRouter.get('/:id', protect, restrictTo('admin'), getBookingById);
bookingRouter.patch('/:id', protect, restrictTo('admin'), editBooking);
bookingRouter.delete('/:id', protect, restrictTo('admin'), deleteBooking);

module.exports = bookingRouter;