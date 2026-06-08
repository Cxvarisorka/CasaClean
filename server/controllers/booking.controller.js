// Modules
const mongoose = require('mongoose');

// Models
const Booking = require('../models/booking.model');
const SpecialRequest = require('../models/specialRequest.model');
const City = require('../models/city.model');
const Service = require('../models/service.model');

// Utils
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const sendEmail = require('../utils/email.util');

/**
 * Validate the special-request add-ons selected for a booking.
 *
 * Accepts an array of SpecialRequest ids and returns a de-duplicated list of
 * ids that all point to real, *enabled* catalogue items — or throws an AppError
 * (caught by catchAsync) when anything is invalid. This stops a booking from
 * referencing add-ons that don't exist or have been disabled.
 */
const resolveSpecialRequests = async (ids) => {
  // Nothing selected is perfectly valid — special requests are optional.
  if (!ids) return [];

  if (!Array.isArray(ids)) {
    throw new AppError("specialRequests must be an array of ids!", 400);
  }

  if (ids.length === 0) return [];

  // Drop duplicates (e.g. the same add-on sent twice from the UI).
  const uniqueIds = [...new Set(ids.map(String))];

  // Reject malformed ids early so we never hand a bad value to the query.
  if (!uniqueIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError("One or more special request ids are invalid!", 400);
  }

  // Every id must resolve to an existing, enabled item.
  const foundCount = await SpecialRequest.countDocuments({
    _id: { $in: uniqueIds },
    enabled: true
  });

  if (foundCount !== uniqueIds.length) {
    throw new AppError("One or more selected special requests do not exist or are unavailable!", 400);
  }

  return uniqueIds;
};

// GET /api/v1/booking (admin) — paginated list, newest first
const getBookings = catchAsync(async (req, res, next) => {
  // Query params arrive as strings; sanitise into safe, bounded numbers so a
  // missing/garbage value can't turn the skip/limit maths into NaN.
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  // Run the page query and the total count in parallel (independent reads).
  const [bookings, bookingCount] = await Promise.all([
    Booking.find()
      .populate('specialRequests')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments()
  ]);

  res.status(200).json({
    status: "success",
    message: "Bookings returned successfully!",
    bookingCount,
    data: { bookings }
  });
});

// GET /api/v1/booking/my — the signed-in user's own bookings, newest first
const getMyBookings = catchAsync(async (req, res, next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  // Scoped to req.user so a user only ever sees their own bookings.
  const filter = { user: req.user._id };

  const [bookings, bookingCount] = await Promise.all([
    Booking.find(filter)
      .populate('specialRequests')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter)
  ]);

  res.status(200).json({
    status: "success",
    message: "Your bookings returned successfully!",
    bookingCount,
    data: { bookings }
  });
});

// GET /api/v1/booking/:id (admin) — single booking (404 if missing, 400 if id malformed)
const getBookingById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const booking = await Booking.findById(id).populate('specialRequests');

  if (!booking) {
    return next(new AppError("Booking not found!", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Booking returned successfully!",
    data: { booking }
  });
});

// POST /api/v1/booking — create a booking (requires a signed-in user)
const createBooking = catchAsync(async (req, res, next) => {
  // Contact details come from the authenticated user's stored profile, so the
  // customer never re-enters what they already gave at registration. The booking
  // keeps its own snapshot of these so the record stays accurate even if the
  // user later edits their profile.
  const { fullname, email, phone } = req.user;

  // Booking-specific fields — the only things the wizard actually collects.
  const {
    serviceId, cityId, streetName, houseNumber, propertySize,
    doorbellName, bookingDate, bookingTime, hours, cleaners,
    totalAmount, notes, specialRequests, supplies
  } = req.body;

  const city = await City.findById(cityId);
  const service = await Service.findById(serviceId);

  // Check if exist service and city
  if (!city || !service) {
    return next(new AppError("City or service not found!", 404));
  }

  // Check if city or service is disabled
  if (!city.enabled || !service.enabled) {
    return next(new AppError("City or service is disabled!", 400));
  }

  // Phone is collected at registration for local accounts, but OAuth (Google)
  // accounts may not have one — let those users supply it for this booking.
  const customerPhone = phone || req.body.customerPhone;

  // Required-field guard. Numeric fields are compared against undefined (not
  // truthiness) so a legitimate 0 isn't rejected.
  if (
    serviceId === undefined || cityId === undefined || !streetName ||
    !houseNumber || !propertySize || !doorbellName || !bookingDate ||
    !bookingTime || hours === undefined || cleaners === undefined ||
    totalAmount === undefined
  ) {
    return next(new AppError("Please provide all required fields for booking!", 400));
  }

  if (!customerPhone) {
    return next(new AppError("Please add a phone number to your profile or provide one for this booking!", 400));
  }

  // Make sure any selected add-ons are real, enabled catalogue items.
  const requestIds = await resolveSpecialRequests(specialRequests);

  // Whitelist exactly what we persist — we never spread req.body, so a caller
  // can't mass-assign server-managed fields (user/status/payment).
  const booking = await Booking.create({
    user: req.user._id,
    serviceId,
    cityId,
    customerName: fullname,
    customerEmail: email,
    customerPhone,
    streetName,
    houseNumber,
    propertySize,
    doorbellName,
    bookingDate,
    bookingTime,
    hours,
    cleaners,
    totalAmount,
    notes: notes ?? null,
    specialRequests: requestIds,
    supplies: Array.isArray(supplies) ? supplies : []
  });

  // Confirmation email is best-effort: a mail failure must not fail the booking
  // that was already saved.
  try {
    await sendEmail({
      email,
      subject: 'CASACLEAN - Your booking is confirmed! 🎉',
      text: `Hello ${fullname},\n\n` +
            `Your reservation has been successfully confirmed!\n\n` +
            `📌 Booking Details:\n` +
            `----------------------------------\n` +
            `📅 Date: ${bookingDate}\n` +
            `⏰ Time: ${bookingTime}\n` +
            `⏳ Duration: ${hours} hours (${cleaners} cleaners)\n` +
            `📍 Address: ${streetName}, No. ${houseNumber}\n` +
            `💰 Total: ${totalAmount} €\n` +
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

// PATCH /api/v1/booking/:id (admin) — partial update
const editBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Whitelist editable fields so an admin request can't overwrite ownership or
  // payment fields (user/paymentIntentId/...) by including them in the body.
  const editableFields = [
    'status', 'bookingDate', 'bookingTime', 'hours', 'cleaners',
    'totalAmount', 'streetName', 'houseNumber', 'propertySize',
    'doorbellName', 'customerPhone', 'notes', 'supplies'
  ];

  const updates = {};
  for (const field of editableFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  // Special requests, if being changed, must still reference real items.
  if (req.body.specialRequests !== undefined) {
    updates.specialRequests = await resolveSpecialRequests(req.body.specialRequests);
  }

  const booking = await Booking.findByIdAndUpdate(id, updates, {
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

// DELETE /api/v1/booking/:id (admin)
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
  getMyBookings,
  getBookingById,
  createBooking,
  editBooking,
  deleteBooking
};
