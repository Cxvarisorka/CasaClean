const mongoose = require('mongoose');

const Booking = require('../models/booking.model');
const SpecialRequest = require('../models/specialRequest.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const sendEmail = require('../utils/email.util');
const Service = require('../models/service.model');
const City = require('../models/city.model');

/**
 * Validate the service/city pair selected for a booking.
 *
 * Fail-closed: both ids MUST be valid ObjectIds that resolve to an existing,
 * *enabled* Service/City document — anything else is rejected. When the service
 * is offered only in specific cities (allCities === false), the chosen city must
 * be one of them. Returns the resolved Service document so the caller can reuse
 * it for add-on compatibility checks.
 *
 * Throws AppError on any failure and does NOT catch — the caller's catchAsync
 * forwards it to the error middleware. Swallowing here would let invalid input
 * through and break the destructuring in the caller.
 */
const resolveServiceAndCity = async (serviceId, cityId) => {
  if (
    !mongoose.Types.ObjectId.isValid(serviceId) ||
    !mongoose.Types.ObjectId.isValid(cityId)
  ) {
    throw new AppError("Invalid service or city id!", 400);
  }

  // Only read the fields we actually validate against; .lean() since we never
  // mutate these documents.
  const [service, city] = await Promise.all([
    Service.findById(serviceId).select("name enabled allCities cities allSpecialRequests specialRequests").lean(),
    City.findById(cityId).select("enabled").lean()
  ]);

  // Combined existence/enabled message so we don't leak existing-but-disabled
  // vs. non-existent.
  if (!service || !service.enabled) {
    throw new AppError("The selected service does not exist or is unavailable!", 400);
  }
  if (!city || !city.enabled) {
    throw new AppError("The selected city does not exist or is unavailable!", 400);
  }

  // Coverage: a city-restricted service must actually serve the chosen city.
  if (!service.allCities) {
    const covered = (service.cities || []).some(
      (c) => String(c) === String(cityId)
    );
    if (!covered) {
      throw new AppError("The selected service is not available in the chosen city!", 400);
    }
  }

  return service;
};

/**
 * Validate the special-request add-ons selected for a booking.
 *
 * Accepts an array of SpecialRequest ids and returns a de-duplicated list of
 * ids that all point to real, *enabled* catalogue items — or throws an AppError
 * (caught by catchAsync) when anything is invalid. This stops a booking from
 * referencing add-ons that don't exist or have been disabled.
 *
 * When a `service` is supplied and it restricts its add-ons
 * (allSpecialRequests === false), every selected id must be one the service
 * actually offers — otherwise the add-on doesn't belong to that service.
 */
const resolveSpecialRequests = async (ids, service = null) => {

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

  // Service/add-on compatibility: a service that lists explicit add-ons may only
  // be booked with those add-ons. (allSpecialRequests === true accepts any
  // enabled add-on.)
  if (service && !service.allSpecialRequests) {
    const allowed = new Set((service.specialRequests || []).map(String));
    if (!uniqueIds.every((id) => allowed.has(id))) {
      throw new AppError("One or more selected special requests are not available for this service!", 400);
    }
  }

  return uniqueIds;
};

/* ----------------------------------------------------- Confirmation email */

// Escape user-provided values before interpolating them into the HTML email so
// a name/address/etc. can never inject markup.
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatEuro = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

/**
 * Build the booking-confirmation email — a branded, email-client-safe HTML body
 * (table layout + inline styles) with a plain-text fallback for deliverability
 * and non-HTML clients. Returns { subject, html, text }.
 *
 * All interpolated user values pass through escapeHtml.
 */
const renderBookingConfirmationEmail = ({
  customerName, serviceName, bookingDate, bookingTime,
  hours, cleaners, streetName, houseNumber, totalAmount
}) => {
  const subject = "CasaClean — Your booking is confirmed 🎉";
  const name = escapeHtml(customerName);
  const total = formatEuro(totalAmount);
  const address =
    [streetName, houseNumber ? `No. ${houseNumber}` : ""].filter(Boolean).join(", ");

  const rows = [
    ["Service", serviceName || "Cleaning service"],
    ["Date", bookingDate],
    ["Time", bookingTime],
    ["Duration", `${hours} h · ${cleaners} cleaner(s)`],
    ["Address", address || "—"],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 0;color:#64748b;font-size:14px;">${escapeHtml(label)}</td>
          <td style="padding:12px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:32px 40px;text-align:center;">
                <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">CasaClean</div>
                <div style="color:#99f6e4;font-size:14px;margin-top:4px;">Booking Confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 8px;text-align:center;">
                <div style="width:56px;height:56px;line-height:56px;border-radius:28px;background-color:#ecfdf5;color:#0d9488;font-size:28px;margin:0 auto;">&#10003;</div>
                <h1 style="margin:20px 0 6px;color:#0f172a;font-size:22px;font-weight:700;">Thank you, ${name}!</h1>
                <p style="margin:0;color:#64748b;font-size:15px;">Your reservation has been successfully confirmed.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                  ${detailRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;color:#0f766e;font-size:15px;font-weight:600;">Total</td>
                    <td style="padding:16px 20px;color:#0f766e;font-size:20px;font-weight:700;text-align:right;">${escapeHtml(total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 36px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  Need to make a change? Just reply to this email and our team will help.<br />
                  &copy; ${new Date().getFullYear()} CasaClean. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text =
    `Hello ${customerName},\n\n` +
    `Your CasaClean booking is confirmed.\n\n` +
    `Service:  ${serviceName || "Cleaning service"}\n` +
    `Date:     ${bookingDate}\n` +
    `Time:     ${bookingTime}\n` +
    `Duration: ${hours} h (${cleaners} cleaner(s))\n` +
    `Address:  ${address || "—"}\n` +
    `Total:    ${total}\n\n` +
    `Thank you for choosing CasaClean!`;

  return { subject, html, text };
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
  // Customer contact details default to the authenticated user's stored profile
  // (the public booking wizard doesn't re-collect what was given at
  // registration). When the caller DOES provide them — e.g. an admin entering a
  // booking on a customer's behalf — the body values win, so the booking is
  // attributed to the real customer rather than the operator. The booking keeps
  // its own snapshot of these regardless.
  const customerName = req.body.customerName || req.user.fullname;
  const customerEmail = req.body.customerEmail || req.user.email;
  const customerPhone = req.body.customerPhone || req.user.phone;

  // Booking-specific fields — the only things the wizard actually collects.
  const {
    serviceId, cityId, streetName, houseNumber, propertySize,
    doorbellName, bookingDate, bookingTime, hours, cleaners,
    totalAmount, notes, specialRequests, supplies
  } = req.body;


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

  if (!customerName || !customerEmail) {
    return next(new AppError("Please provide the customer's name and email!", 400));
  }

  if (!customerPhone) {
    return next(new AppError("Please add a phone number to your profile or provide one for this booking!", 400));
  }

  // Validate the service/city pair (existence, enabled state, coverage) and
  // reuse the resolved service to check add-on compatibility below.
  const service = await resolveServiceAndCity(serviceId, cityId);

  // Make sure any selected add-ons are real, enabled, and offered by the service.
  const requestIds = await resolveSpecialRequests(specialRequests, service);

  // Whitelist exactly what we persist — we never spread req.body, so a caller
  // can't mass-assign server-managed fields (user/status/payment).
  const booking = await Booking.create({
    user: req.user._id,
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
    totalAmount,
    notes: notes ?? null,
    specialRequests: requestIds,
    supplies: Array.isArray(supplies) ? supplies : []
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
      totalAmount
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
    updates.specialRequests = await resolveSpecialRequests(req.body.specialRequests, service);
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
