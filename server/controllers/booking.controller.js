// Modules
const mongoose = require('mongoose');

// Models
const Booking = require('../models/booking.model');
const SpecialRequest = require('../models/specialRequest.model');
const CleaningTool = require('../models/cleaningTool.model');
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
  resolveCleaningTools,
  assertBookingWindow,
  computeBookingTotal,
  renderBookingConfirmationEmail,
  renderRefundEmail,
  formatEuro
} = require('../services/booking.service');

// Invoices track the money, so a refund has to be reflected on them too.
const { markInvoiceRefunded } = require('../services/invoice.service');
// Catalogue prices are VAT-exclusive; VAT is added on top unless the customer is
// a verified business.
const { priceForCustomer, applyTaxTreatment } = require('../utils/tax.util');

// Local-midnight date helpers — booking dates are YYYY-MM-DD strings, so a
// plain string comparison against today is a correct date comparison.
const { todayString } = require('../utils/date.util');

// Refund policy for a customer self-cancellation: a full refund when made at
// least CANCELLATION_WINDOW_HOURS before the appointment, and inside that window
// a refund of everything except a retained one-hour fee. Both rules live in
// utils/cancellation.util.js.
const {
  CANCELLATION_WINDOW_HOURS,
  isLateCancellation,
  lateCancellationSettlement
} = require('../utils/cancellation.util');

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

// GET /api/v1/booking (admin) — paginated list, newest first.
// Optional filters: ?status=confirmed  ?from=2026-07-01  ?to=2026-07-31
// (from/to bound bookingDate; "YYYY-MM-DD" strings compare lexicographically).
const getBookings = catchAsync(async (req, res, next) => {
  // Query params arrive as strings; sanitise into safe, bounded numbers so a
  // missing/garbage value can't turn the skip/limit maths into NaN.
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  // Filters are whitelisted/format-checked at the point of use (req.query is
  // not covered by sanitizeMongo) — never passed into the filter raw.
  const filter = {};
  const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (VALID_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const from = DATE_RE.test(String(req.query.from)) ? req.query.from : null;
  const to = DATE_RE.test(String(req.query.to)) ? req.query.to : null;
  if (from || to) {
    filter.bookingDate = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {})
    };
  }

  const hasFilter = Object.keys(filter).length > 0;

  // Run the page query and the total count in parallel (independent reads).
  const [bookings, bookingCount] = await Promise.all([
    Booking.find(filter)
      .populate('serviceId', 'name')
      .populate('cityId', 'name')
      .populate('specialRequests')
      .populate('cleaningTools')
      .populate('workers', 'fullname')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    // No filter -> estimatedDocumentCount reads collection metadata (O(1))
    // instead of scanning every document like countDocuments() would.
    hasFilter ? Booking.countDocuments(filter) : Booking.estimatedDocumentCount()
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
      .populate('cleaningTools')
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
    .populate('cleaningTools')
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
      // The tax fields come along because the booking is priced against the
      // LINKED customer's VAT status, not the admin's.
      const linked = await User.findById(req.body.userId)
        .select('fullname email phone customerType vatNumber vatStatus companyName');
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
    notes, specialRequests, cleaningTools, supplies, workers
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

  // Start inside working hours, end before closing, and not in the past today.
  assertBookingWindow(city, bookingDate, bookingTime, hours);

  // Make sure any selected add-ons are real, enabled, and offered by the
  // service. Returns full documents so we can sum prices (Fix 1).
  const resolvedSpecialRequests = await resolveSpecialRequests(specialRequests, service);

  // Same fail-closed gate for the tool catalogue: every tool must be real,
  // enabled and usable on the chosen service.
  const resolvedCleaningTools = await resolveCleaningTools(cleaningTools, service);

  // Fix 1: compute the booking total on the server — never trust the client.
  // specialRequests/cleaningTools now contain full documents with a `price` field.
  const netTotal = computeBookingTotal({
    service,
    hours,
    cleaners,
    specialRequests: resolvedSpecialRequests,
    cleaningTools: resolvedCleaningTools
  });

  // Apply the customer's VAT treatment to the net catalogue total. `profile` is
  // the LINKED account for an on-behalf booking, the admin for a self-booking,
  // and null for a walk-in — a walk-in has no verified VAT number, so it falls
  // through to the standard treatment, which is the right default.
  const { totalAmount: computedTotal, tax } = priceForCustomer(netTotal, profile);

  // Extract just the ids for storage (the Booking model stores ObjectId refs).
  const requestIds = resolvedSpecialRequests.map((sr) => sr._id);
  const toolIds = resolvedCleaningTools.map((ct) => ct._id);

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
    tax,
    status,
    paymentMethod: 'manual',
    paymentStatus: 'manual',
    notes: notes ?? null,
    specialRequests: requestIds,
    cleaningTools: toolIds,
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
  const ctChanged = req.body.cleaningTools !== undefined;
  const hoursChanged = updates.hours !== undefined;
  const cleanersChanged = updates.cleaners !== undefined;
  const timeChanged = updates.bookingTime !== undefined;
  const dateChanged = updates.bookingDate !== undefined;

  // We only need the existing booking + its service/city when a change affects
  // add-on/tool eligibility, the price, or the working-hours window. For a pure
  // status/notes/address edit we skip the extra reads entirely.
  let existing = null;
  let service = null;
  let city = null;
  if (srChanged || ctChanged || hoursChanged || cleanersChanged || timeChanged || dateChanged) {
    existing = await Booking.findById(id)
      // `tax` comes along so a reprice re-applies the treatment this booking was
      // originally priced under (see the reprice block below).
      .select('serviceId cityId hours cleaners bookingDate bookingTime specialRequests cleaningTools tax')
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

  // Only an actual RESCHEDULE into the past is rejected. The admin form
  // re-sends the booking's own date on every edit, and past bookings are
  // exactly the ones being marked completed / annotated / staffed after the
  // fact — so a blanket "no past dates" rule (which used to live in
  // editBookingSchema) made those edits impossible. An unchanged date always
  // passes, whatever it is.
  if (dateChanged && updates.bookingDate !== existing.bookingDate) {
    if (updates.bookingDate < todayString()) {
      return next(new AppError("Booking date can't be in the past!", 400, {
        bookingDate: ["Booking date can't be in the past!"]
      }));
    }
  }

  // Re-validate the working-hours window when the date, time OR duration
  // changes — a longer booking can run past closing even with the same start.
  if ((timeChanged || hoursChanged || dateChanged) && city) {
    assertBookingWindow(
      city,
      dateChanged ? updates.bookingDate : existing.bookingDate,
      timeChanged ? updates.bookingTime : existing.bookingTime,
      hoursChanged ? updates.hours : existing.hours
    );
  }

  // Special requests being changed must still pass the service compatibility
  // gate. resolveSpecialRequests returns full docs so we can also re-price below.
  let resolvedSpecialRequests = null;
  if (srChanged) {
    resolvedSpecialRequests = await resolveSpecialRequests(req.body.specialRequests, service);
    updates.specialRequests = resolvedSpecialRequests.map((sr) => sr._id);
  }

  // Cleaning tools being changed must still pass the tool-side service gate
  // (a tool restricted to specific services can't be attached to others).
  let resolvedCleaningTools = null;
  if (ctChanged) {
    resolvedCleaningTools = await resolveCleaningTools(req.body.cleaningTools, service);
    updates.cleaningTools = resolvedCleaningTools.map((ct) => ct._id);
  }

  // Worker (re)assignment — admin-only route, so no extra role check needed.
  // An empty array clears the current assignment; ids are validated fail-closed.
  if (req.body.workers !== undefined) {
    updates.workers = await resolveWorkers(req.body.workers);
  }

  // Recompute the server-managed total whenever a price input (hours, add-ons
  // or tools) changes — otherwise the stored amount would drift out of sync
  // with the booking. Price = pricePerHour * hours + sum(add-on prices) +
  // sum(tool surcharges).
  if ((hoursChanged || cleanersChanged || srChanged || ctChanged) && service) {
    const finalHours = hoursChanged ? updates.hours : existing.hours;
    const finalCleaners = cleanersChanged ? updates.cleaners : existing.cleaners;

    let finalSpecialRequests;
    if (srChanged) {
      finalSpecialRequests = resolvedSpecialRequests;
    } else {
      // Something else changed but the add-ons didn't — price the existing ones.
      // Look up by id only (no `enabled` filter) so a since-disabled add-on
      // still counts.
      const existingDocs = await SpecialRequest
        .find({ _id: { $in: existing.specialRequests || [] } })
        .select('price')
        .lean();
      finalSpecialRequests = existingDocs;
    }

    // Same pattern for the tools: price the incoming selection when it changed,
    // otherwise the booking's existing ones (again without an `enabled` filter).
    let finalCleaningTools;
    if (ctChanged) {
      finalCleaningTools = resolvedCleaningTools;
    } else {
      const existingTools = await CleaningTool
        .find({ _id: { $in: existing.cleaningTools || [] } })
        .select('price')
        .lean();
      finalCleaningTools = existingTools;
    }

    const repricedNet = computeBookingTotal({
      service,
      hours: finalHours,
      cleaners: finalCleaners,
      specialRequests: finalSpecialRequests,
      cleaningTools: finalCleaningTools
    });

    // Re-apply the booking's OWN stored treatment rather than re-resolving it
    // from the customer's current profile. An edit changes what is owed, not who
    // the customer was when they booked — a business that has since let its VAT
    // registration lapse must not have an existing booking silently re-taxed.
    const repriced = applyTaxTreatment(repricedNet, existing.tax);
    updates.totalAmount = repriced.totalAmount;
    updates.tax = repriced.tax;
  }

  // An admin cancelling a booking must release the money too — a status flip to
  // 'cancelled' here can't be allowed to bypass the refund. Load the booking's
  // payment fields, refund a paid card booking, and merge the resulting payment
  // fields into the update so they persist atomically with the status change.
  if (updates.status === 'cancelled') {
    // Same atomic claim as the customer cancel path: exactly one caller may
    // transition a booking into 'cancelled', and only that caller performs the
    // refund. Without this, two concurrent admin cancels both see paymentStatus
    // 'paid' and both call Stripe. `new: false` returns the pre-update document.
    const claimed = await Booking.findOneAndUpdate(
      { _id: id, status: { $ne: 'cancelled' } },
      { $set: { status: 'cancelled' } },
      { new: false }
    )
      .select('paymentMethod paymentStatus paymentIntentId status customerName customerEmail bookingDate totalAmount serviceId')
      .populate('serviceId', 'name');

    if (!claimed) {
      // Either the booking is gone, or it was already cancelled (in which case
      // there is nothing left to refund and the remaining edits still apply).
      const exists = await Booking.exists({ _id: id });
      if (!exists) {
        return next(new AppError("Booking not found!", 404));
      }
    } else {
      let refundUpdate = null;
      try {
        refundUpdate = await refundBookingPayment(claimed);
      } catch (refundError) {
        // Never leave a booking cancelled while the customer is still charged.
        await Booking.updateOne({ _id: id }, { $set: { status: claimed.status } });
        return next(refundError);
      }

      if (refundUpdate) {
        Object.assign(updates, refundUpdate);

        // Stamp the invoice so an exported PDF reflects the reversal.
        await markInvoiceRefunded(id, refundUpdate.refundedAt).catch((err) =>
          console.error('Invoice refund stamp error:', err.message)
        );

        // Best-effort refund email.
        try {
          const { subject, html, text } = renderRefundEmail({
            customerName: claimed.customerName,
            serviceName: claimed.serviceId?.name,
            bookingDate: claimed.bookingDate,
            amount: claimed.totalAmount
          });
          await sendEmail({ email: claimed.customerEmail, subject, html, text });
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
    .populate('cleaningTools')
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

  // Claim the cancellation ATOMICALLY before touching Stripe. Two concurrent
  // cancels (a double-clicked button is enough) would otherwise both read
  // paymentStatus 'paid' and both issue a refund. `new: false` returns the
  // PRE-update document, which carries the payment fields we need plus the
  // status to restore if the refund fails.
  // Ownership is enforced in the query itself: a booking that isn't the user's
  // simply isn't found (no information leak about other users' bookings).
  const booking = await Booking.findOneAndUpdate(
    { _id: id, user: req.user._id, status: { $in: ['pending', 'confirmed'] } },
    { $set: { status: 'cancelled' } },
    { new: false }
  );

  if (!booking) {
    // Losing the claim is not automatically a 404 — distinguish "not yours /
    // doesn't exist" from a booking that simply isn't in a cancellable state.
    const current = await Booking.findOne({ _id: id, user: req.user._id })
      .select('status')
      .lean();
    if (!current) {
      return next(new AppError("Booking not found!", 404));
    }
    if (current.status === 'cancelled') {
      return next(new AppError("This booking is already cancelled.", 400));
    }
    return next(new AppError("A completed booking can't be cancelled.", 400));
  }

  const previousStatus = booking.status;

  // Refund policy: cancelling at least CANCELLATION_WINDOW_HOURS before the
  // appointment returns the whole charge. Inside the window the slot is already
  // burned, so we keep a fee worth one hour of the booked crew and return the
  // rest. Add-on prices are needed to work out what that hour is worth, and they
  // live on the referenced catalogue documents.
  const late = isLateCancellation(booking);
  let settlement = null;
  if (late) {
    await booking.populate([
      { path: 'specialRequests', select: 'price' },
      { path: 'cleaningTools', select: 'price' }
    ]);
    settlement = lateCancellationSettlement(booking);
  }

  // Release the money. On a Stripe failure we roll the status back to what it
  // was and abort — a booking must never be left cancelled while the customer
  // is still charged. It's a no-op for manual/offline or unpaid bookings, and
  // for a late cancellation whose fee swallows the entire charge (a one-hour
  // booking), which leaves the payment exactly as it was.
  let refundUpdate = null;
  try {
    refundUpdate = await refundBookingPayment(
      booking,
      settlement ? { amount: settlement.refundAmount } : {}
    );
  } catch (refundError) {
    await Booking.updateOne({ _id: id }, { $set: { status: previousStatus } });
    return next(refundError);
  }

  if (refundUpdate) {
    Object.assign(booking, refundUpdate);
    await Booking.updateOne({ _id: id }, { $set: refundUpdate });
  }
  booking.status = 'cancelled';

  // Best-effort refund email (only when an actual refund was issued).
  if (refundUpdate) {
    // Stamp the invoice so an exported PDF reflects the reversal — but only for
    // a full refund. A late cancellation kept money the invoice correctly says
    // was charged, so marking that document 'refunded' would misstate it; the
    // retained fee stands on the invoice as issued.
    if (refundUpdate.paymentStatus === 'refunded') {
      await markInvoiceRefunded(id, refundUpdate.refundedAt).catch((err) =>
        console.error('Invoice refund stamp error:', err.message)
      );
    }

    try {
      const serviceDoc = await Booking.findById(booking._id).populate('serviceId', 'name').select('serviceId').lean();
      const { subject, html, text } = renderRefundEmail({
        customerName: booking.customerName,
        serviceName: serviceDoc?.serviceId?.name,
        bookingDate: booking.bookingDate,
        amount: refundUpdate.refundAmount,
        fee: settlement?.fee || 0,
        charged: booking.totalAmount
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
    .populate('cleaningTools')
    .populate('workers', 'fullname')
    .lean();

  // Message reflects the money outcome: fully refunded, refunded minus the
  // one-hour late-cancellation fee, entirely kept (a late cancellation of a
  // booking no longer than that hour), or nothing to refund (manual/unpaid).
  const wasPaidCard =
    booking.paymentMethod === 'card' &&
    ['paid', 'refunded', 'partially-refunded'].includes(booking.paymentStatus);
  let message = "Booking cancelled successfully!";
  if (refundUpdate && refundUpdate.paymentStatus === 'partially-refunded') {
    message =
      `Booking cancelled and ${formatEuro(refundUpdate.refundAmount)} refunded. ` +
      `Cancellations within ${CANCELLATION_WINDOW_HOURS} hours of the appointment keep a ` +
      `late-cancellation fee of ${formatEuro(settlement.fee)} — one hour of the booked cleaning.`;
  } else if (refundUpdate) {
    message = "Booking cancelled and refunded successfully!";
  } else if (late && wasPaidCard) {
    message =
      `Booking cancelled. Cancellations within ${CANCELLATION_WINDOW_HOURS} hours of the ` +
      `appointment keep a late-cancellation fee of one hour of the booked cleaning, which ` +
      `covers this booking in full — please contact support if you think that's wrong.`;
  }

  res.status(200).json({
    status: "success",
    message,
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
