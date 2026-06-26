// Modules
const mongoose = require('mongoose');

// Models
const Booking = require('../models/booking.model');
const SpecialRequest = require('../models/specialRequest.model');
const User = require('../models/user.model');
const Worker = require('../models/worker.model');

// Utils
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const sendEmail = require('../utils/email.util');

// Shared booking logic (service/city + add-on resolution, pricing, emails) lives
// in the service layer so the payment controller can reuse it.
const {
  resolveServiceAndCity,
  resolveSpecialRequests,
  renderBookingConfirmationEmail,
  renderRefundEmail
} = require('../services/booking.service');

// Refund helper lives in the payment controller (it talks to Stripe). Used when
// a paid booking is cancelled (by the user or an admin).
const { refundBookingPayment } = require('../controllers/payment.controller');

/**
 * Validate the cleaning staff assigned to a booking.
 *
 * Admin-only at the call site. Fail-closed: every id must be a valid ObjectId
 * pointing to an existing Worker. Unlike special requests we do NOT require the
 * worker to be `enabled` — disabling a worker (e.g. on leave) shouldn't make an
 * existing booking impossible to re-save. Ids are de-duplicated and returned as
 * ObjectIds ready to store on the booking. An empty/absent list resolves to [].
 */
const resolveWorkers = async (ids) => {
  if (!ids) return [];

  if (!Array.isArray(ids)) {
    throw new AppError("workers must be an array of ids!", 400);
  }

  if (ids.length === 0) return [];

  const uniqueIds = [...new Set(ids.map(String))];

  if (!uniqueIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError("One or more worker ids are invalid!", 400);
  }

  const foundDocs = await Worker.find({ _id: { $in: uniqueIds } })
    .select("_id")
    .lean();

  if (foundDocs.length !== uniqueIds.length) {
    throw new AppError("One or more selected workers do not exist!", 400);
  }

  return foundDocs.map((w) => w._id);
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
      .populate('serviceId', 'name')
      .populate('cityId', 'name')
      .populate('specialRequests')
      .populate('workers', 'fullname')
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
      .populate('serviceId', 'name')
      .populate('cityId', 'name')
      .populate('specialRequests')
      .populate('workers', 'fullname')
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
  const booking = await Booking.findById(id)
    .populate('serviceId', 'name')
    .populate('cityId', 'name')
    .populate('specialRequests')
    .populate('workers', 'fullname')
    .lean();

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
  const isAdmin = req.user.role === 'admin';

  // "On behalf" = an admin explicitly booking FOR a customer, signalled by
  // supplying a linked account (userId) and/or typed customer name/email.
  // Everything else is a SELF-booking owned by req.user with their own details:
  //  • any normal user (body name/email are ignored — no identity spoofing), and
  //  • an admin booking through the public wizard for themselves (which sends no
  //    customer-identity fields). This is why we key off the supplied data, not
  //    the role alone — otherwise an admin could never book for themselves.
  const onBehalf =
    isAdmin && Boolean(req.body.userId || req.body.customerName || req.body.customerEmail);

  let owner = req.user._id;
  let profile = req.user;

  if (onBehalf) {
    if (req.body.userId) {
      const linked = await User.findById(req.body.userId).select('fullname email phone');
      if (!linked) {
        return next(new AppError("The linked customer account does not exist!", 400));
      }
      owner = linked._id;
      profile = linked;
    } else {
      owner = undefined; // walk-in / phone booking not tied to an account
      profile = null;
    }
  }

  const customerName = onBehalf
    ? (req.body.customerName || profile?.fullname)
    : req.user.fullname;
  const customerEmail = onBehalf
    ? (req.body.customerEmail || profile?.email)
    : req.user.email;
  const customerPhone = onBehalf
    ? (req.body.customerPhone || profile?.phone)
    : (req.body.customerPhone || req.user.phone);

  // Booking-specific fields — the only things the wizard actually collects.
  const {
    serviceId, cityId, streetName, houseNumber, propertySize,
    doorbellName, bookingDate, bookingTime, hours, cleaners,
    notes, specialRequests, supplies, workers
  } = req.body;

  // Required-field guard. Numeric fields are compared against undefined (not
  // truthiness) so a legitimate 0 isn't rejected.
  if (
    serviceId === undefined || cityId === undefined || !streetName ||
    !houseNumber || !propertySize || !doorbellName || !bookingDate ||
    !bookingTime || hours === undefined || cleaners === undefined
  ) {
    return next(new AppError("Please provide all required fields for booking!", 400));
  }

  if (!customerName || !customerEmail) {
    return next(new AppError("Please provide the customer's name and email!", 400));
  }

  if (!customerPhone) {
    return next(new AppError("Please add a phone number to your profile or provide one for this booking!", 400));
  }

  // Validate the service/city pair (existence, enabled state, coverage).
  // Now returns both the service (for price computation) and the city
  // (for working-hours check). Fix 1 + Fix 3.
  const { service, city } = await resolveServiceAndCity(serviceId, cityId);

  // Fix 3: reject bookingTime outside city working hours. Both values are
  // zero-padded "HH:MM" strings so lexicographic comparison is equivalent
  // to numeric comparison.
  if (bookingTime < city.workingHourStarts || bookingTime >= city.workingHourEnds) {
    return next(new AppError("Booking time is outside city working hours", 400));
  }

  // Make sure any selected add-ons are real, enabled, and offered by the
  // service. Returns full documents so we can sum prices (Fix 1).
  const resolvedSpecialRequests = await resolveSpecialRequests(specialRequests, service);

  // Fix 1: compute the booking total on the server — never trust the client.
  // specialRequests now contains full documents with a `price` field.
  const computedTotal = service.pricePerHour * hours +
    resolvedSpecialRequests.reduce((sum, sr) => sum + sr.price, 0);

  // Extract just the ids for storage (the Booking model stores ObjectId refs).
  const requestIds = resolvedSpecialRequests.map((sr) => sr._id);

  // Worker assignment is an admin-only concern. A normal customer's `workers`
  // (even if smuggled past the optional schema) is ignored — only an admin
  // creating a booking on a customer's behalf can assign staff.
  const assignedWorkers = isAdmin ? await resolveWorkers(workers) : [];

  // Status is server-managed (the create schema rejects any client-supplied
  // value). An admin booking on a customer's behalf starts as 'pending' so it
  // can be reviewed/confirmed by staff; an admin booking for themselves is
  // 'confirmed' immediately (matching the model default).
  const status = onBehalf ? 'pending' : 'confirmed';

  // This endpoint is admin-only (customers pay online via /payment/booking/*),
  // so every booking created here is a MANUAL / offline (cash/invoice) booking:
  // no Stripe charge is taken. The money is settled out-of-band.
  // Whitelist exactly what we persist — we never spread req.body, so a caller
  // can't mass-assign server-managed fields (user/paymentIntentId/totalAmount).
  const booking = await Booking.create({
    user: owner,
    serviceId,
    cityId,
    customerName,
    customerEmail,
    customerPhone,
    streetName,
    houseNumber,
    propertySize,
    doorbellName,
    bookingDate,
    bookingTime,
    hours,
    cleaners,
    totalAmount: computedTotal,
    status,
    paymentMethod: 'manual',
    paymentStatus: 'manual',
    notes: notes ?? null,
    specialRequests: requestIds,
    supplies: Array.isArray(supplies) ? supplies : [],
    workers: assignedWorkers
  });

  // Confirmation email is best-effort: a mail failure must not fail the booking
  // that was already saved.
  try {
    const { subject, html, text } = renderBookingConfirmationEmail({
      customerName,
      serviceName: service?.name,
      bookingDate,
      bookingTime,
      hours,
      cleaners,
      streetName,
      houseNumber,
      totalAmount: computedTotal
    });
    await sendEmail({ email: customerEmail, subject, html, text });
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
  // totalAmount is intentionally excluded — price is server-managed (Fix 1).
  const editableFields = [
    'status', 'bookingDate', 'bookingTime', 'hours', 'cleaners',
    'streetName', 'houseNumber', 'propertySize',
    'doorbellName', 'customerPhone', 'notes', 'supplies'
  ];

  const updates = {};
  for (const field of editableFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const srChanged = req.body.specialRequests !== undefined;
  const hoursChanged = updates.hours !== undefined;
  const timeChanged = updates.bookingTime !== undefined;

  // We only need the existing booking + its service/city when a change affects
  // add-on eligibility, the price, or the working-hours window. For a pure
  // status/notes/address edit we skip the extra reads entirely.
  let existing = null;
  let service = null;
  let city = null;
  if (srChanged || hoursChanged || timeChanged) {
    existing = await Booking.findById(id)
      .select('serviceId cityId hours specialRequests')
      .lean();
    if (!existing) {
      return next(new AppError("Booking not found!", 404));
    }
    // Re-use the booking's own service/city (already validated at create time)
    // to recover pricePerHour and the city working-hours window.
    ({ service, city } = await resolveServiceAndCity(
      String(existing.serviceId),
      String(existing.cityId)
    ));
  }

  // Re-validate the working-hours window when the time changes (the create-time
  // guard otherwise wouldn't run on edits).
  if (timeChanged && city) {
    if (updates.bookingTime < city.workingHourStarts || updates.bookingTime >= city.workingHourEnds) {
      return next(new AppError("Booking time is outside city working hours", 400));
    }
  }

  // Special requests being changed must still pass the service compatibility
  // gate. resolveSpecialRequests returns full docs so we can also re-price below.
  let resolvedSpecialRequests = null;
  if (srChanged) {
    resolvedSpecialRequests = await resolveSpecialRequests(req.body.specialRequests, service);
    updates.specialRequests = resolvedSpecialRequests.map((sr) => sr._id);
  }

  // Worker (re)assignment — admin-only route, so no extra role check needed.
  // An empty array clears the current assignment; ids are validated fail-closed.
  if (req.body.workers !== undefined) {
    updates.workers = await resolveWorkers(req.body.workers);
  }

  // Recompute the server-managed total whenever a price input (hours or add-ons)
  // changes — otherwise the stored amount would drift out of sync with the
  // booking. Price = pricePerHour * hours + sum(add-on prices).
  if ((hoursChanged || srChanged) && service) {
    const finalHours = hoursChanged ? updates.hours : existing.hours;

    let addOnTotal;
    if (srChanged) {
      addOnTotal = resolvedSpecialRequests.reduce((sum, sr) => sum + sr.price, 0);
    } else {
      // Hours changed but the add-ons didn't — price the existing ones. Look up
      // by id only (no `enabled` filter) so a since-disabled add-on still counts.
      const existingDocs = await SpecialRequest
        .find({ _id: { $in: existing.specialRequests || [] } })
        .select('price')
        .lean();
      addOnTotal = existingDocs.reduce((sum, sr) => sum + sr.price, 0);
    }

    updates.totalAmount = service.pricePerHour * finalHours + addOnTotal;
  }

  // An admin cancelling a booking must release the money too — a status flip to
  // 'cancelled' here can't be allowed to bypass the refund. Load the booking's
  // payment fields, refund a paid card booking, and merge the resulting payment
  // fields into the update so they persist atomically with the status change.
  if (updates.status === 'cancelled') {
    const current = await Booking.findById(id)
      .select('paymentMethod paymentStatus paymentIntentId status customerName customerEmail bookingDate totalAmount')
      .populate('serviceId', 'name')
      .lean();
    if (!current) {
      return next(new AppError("Booking not found!", 404));
    }
    // Idempotent: don't refund again if it's already cancelled.
    if (current.status !== 'cancelled') {
      const refundUpdate = await refundBookingPayment(current);
      if (refundUpdate) {
        Object.assign(updates, refundUpdate);

        // Best-effort refund email.
        try {
          const { subject, html, text } = renderRefundEmail({
            customerName: current.customerName,
            serviceName: current.serviceId?.name,
            bookingDate: current.bookingDate,
            amount: current.totalAmount
          });
          await sendEmail({ email: current.customerEmail, subject, html, text });
        } catch (emailError) {
          console.error('Refund email send error:', emailError.message);
        }
      }
    }
  }

  const booking = await Booking.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  })
    .populate('serviceId', 'name')
    .populate('cityId', 'name')
    .populate('specialRequests')
    .populate('workers', 'fullname');

  if (!booking) {
    return next(new AppError("Booking not found!", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Booking updated successfully!",
    data: { booking }
  });
});

// PATCH /api/v1/booking/:id/cancel — a user cancels their OWN booking.
// Scoped to req.user so it can't touch anyone else's booking (admins use the
// admin PATCH route to change any status). Only a pending/confirmed booking can
// be cancelled — completed work and already-cancelled bookings are rejected.
const cancelMyBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid booking id!", 400));
  }

  // Ownership is enforced in the query itself: a booking that isn't the user's
  // simply isn't found (no information leak about other users' bookings).
  const booking = await Booking.findOne({ _id: id, user: req.user._id });
  if (!booking) {
    return next(new AppError("Booking not found!", 404));
  }

  if (booking.status === 'cancelled') {
    return next(new AppError("This booking is already cancelled.", 400));
  }
  if (booking.status === 'completed') {
    return next(new AppError("A completed booking can't be cancelled.", 400));
  }

  // Release the money before marking the booking cancelled. refundBookingPayment
  // throws on a Stripe failure, which (via catchAsync) aborts the cancellation —
  // we never want a booking marked cancelled while the customer is still charged.
  // It's a no-op for manual/offline or unpaid bookings.
  const refundUpdate = await refundBookingPayment(booking);
  if (refundUpdate) {
    Object.assign(booking, refundUpdate);
  }

  booking.status = 'cancelled';
  await booking.save();

  // Best-effort refund email (only when an actual refund was issued).
  if (refundUpdate) {
    try {
      const serviceDoc = await Booking.findById(booking._id).populate('serviceId', 'name').select('serviceId').lean();
      const { subject, html, text } = renderRefundEmail({
        customerName: booking.customerName,
        serviceName: serviceDoc?.serviceId?.name,
        bookingDate: booking.bookingDate,
        amount: booking.totalAmount
      });
      await sendEmail({ email: booking.customerEmail, subject, html, text });
    } catch (emailError) {
      console.error('Refund email send error:', emailError.message);
    }
  }

  const populated = await Booking.findById(booking._id)
    .populate('serviceId', 'name')
    .populate('cityId', 'name')
    .populate('specialRequests')
    .populate('workers', 'fullname')
    .lean();

  res.status(200).json({
    status: "success",
    message: refundUpdate
      ? "Booking cancelled and refunded successfully!"
      : "Booking cancelled successfully!",
    data: { booking: populated }
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
  cancelMyBooking,
  deleteBooking
};
