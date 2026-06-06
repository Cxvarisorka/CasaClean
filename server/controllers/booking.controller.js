const Booking = require('../models/booking.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const sendEmail = require('../utils/email.util');

// GET /api/v1/booking 
const getBookings = catchAsync(async (req, res, next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  const bookings = await Booking.find()
    .skip((page - 1) * limit)
    .limit(limit);

  const bookingCount = await Booking.countDocuments();

  res.status(200).json({
    status: "success",
    message: "Bookings returned successfully!",
    bookingCount,
    data: { bookings }
  });
});

// GET /api/v1/booking/:id 
const getBookingById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const booking = await Booking.findById(id);

  if (!booking) {
    return next(new AppError("Booking not found!", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Booking returned successfully!",
    data: { booking }
  });
});

// POST /api/v1/booking
const createBooking = catchAsync(async (req, res, next) => {
  const { 
    service_id, city_id, customer_name, customer_email, 
    customer_phone, street_name, house_number, property_size, 
    doorbell_name, booking_date, booking_time, hours, 
    cleaners, total_amount, payment_intent_id 
  } = req.body;

  if (!service_id || !city_id || !customer_name || !customer_email || 
      !customer_phone || !street_name || !house_number || !property_size || 
      !doorbell_name || !booking_date || !booking_time || !hours || 
      !cleaners || !total_amount || !payment_intent_id) {
    return next(new AppError("Please provide all required fields for booking!", 400));
  }

  const booking = await Booking.create(req.body);
  try {
    await sendEmail({
      email: customer_email,
      subject: 'CASACLEAN - Your booking is confirmed! 🎉',
      text: `Hello ${customer_name},\n\n` +
            `Your reservation has been successfully confirmed!\n\n` +
            `📌 Booking Details:\n` +
            `----------------------------------\n` +
            `📅 Date: ${booking_date}\n` +
            `⏰ Time: ${booking_time}\n` +
            `⏳ Duration: ${hours} hours (${cleaners} cleaners)\n` +
            `📍 Address: ${street_name}, No. ${house_number}\n` +
            `💰 Total Paid: ${total_amount} €\n` +
            `----------------------------------\n\n` +
            `Thank you for choosing CASACLEAN!`
    });
  } catch (emailError) {
    console.error('Email send error:', emailError.message);
  }

  res.status(201).json({
    status: "success",
    message: "Booking created successfully!",
    data: { booking }
  });
});

// PATCH /api/v1/booking/:id 
const editBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const booking = await Booking.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true
  });

  if (!booking) {
    return next(new AppError("Booking not found!", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Booking updated successfully!",
    data: { booking }
  });
});

// DELETE /api/v1/booking/:id 
const deleteBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const booking = await Booking.findByIdAndDelete(id);

  if (!booking) {
    return next(new AppError("Booking not found!", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Booking deleted successfully!"
  });
});

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  editBooking,
  deleteBooking
};