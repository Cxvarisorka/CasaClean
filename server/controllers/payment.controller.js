// Payment controller (Stripe)
// ---------------------------
// Owns the customer-facing money flow:
//   - POST /payment/booking/intent    create a PaymentIntent for a booking
//   - POST /payment/booking/finalize  promote a paid intent into a real booking
//   - GET  /payment/methods           list the user's saved cards
//   - POST /payment/methods/setup-intent  add a card (SetupIntent)
//   - DELETE /payment/methods/:id     remove a saved card
//
// It also exports promotePendingBooking and refundBookingPayment, which are
// reused by the webhook handler and the booking controller respectively.

const stripe = require('../config/stripe.config');

const Booking = require('../models/booking.model');
const PendingBooking = require('../models/pendingBooking.model');
const User = require('../models/user.model');

const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const sendEmail = require('../utils/email.util');
const { toMinorUnits } = require('../utils/money.util');
const {
  buildValidatedBookingDraft,
  renderBookingConfirmationEmail
} = require('../services/booking.service');

const CURRENCY = 'eur';

/* --------------------------------------------------------- helpers -------- */

/**
 * Return the user's Stripe Customer id, creating (and persisting) one the first
 * time. Reads the user fresh from the DB so a customer id created earlier in the
 * same session isn't missed (req.user is a lean snapshot from login time).
 */
const ensureStripeCustomer = async (user) => {
  const fresh = await User.findById(user._id).select('stripeCustomerId email fullname');
  if (fresh?.stripeCustomerId) return fresh.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: fresh?.email || user.email,
    name: fresh?.fullname || user.fullname,
    metadata: { userId: String(user._id) }
  });

  await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
  return customer.id;
};

/**
 * Promote a successfully-paid PaymentIntent's PendingBooking draft into a real
 * Booking. Shared by the finalize endpoint (instant UX) and the webhook
 * (backstop) — so it MUST be idempotent: the sparse-unique paymentIntentId index
 * on Booking guarantees a given intent produces at most one booking, and a
 * concurrent duplicate create is caught and resolved to the existing booking.
 *
 * @param {string} paymentIntentId
 * @param {Object} [paymentIntent]  the Stripe PI object (for stripeStatus)
 * @returns {Promise<Object|null>} the booking, or null if there's nothing to do
 */
const promotePendingBooking = async (paymentIntentId, paymentIntent = null) => {
  // Already promoted? Return the existing booking (idempotent).
  const existing = await Booking.findOne({ paymentIntentId });
  if (existing) return existing;

  const pending = await PendingBooking.findOne({ paymentIntentId });
  if (!pending) return null; // expired/never existed and no booking — nothing to do

  const d = pending.draft;

  let booking;
  try {
    booking = await Booking.create({
      user: pending.user,
      serviceId: d.serviceId,
      cityId: d.cityId,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone,
      streetName: d.streetName,
      houseNumber: d.houseNumber,
      propertySize: d.propertySize,
      doorbellName: d.doorbellName,
      bookingDate: d.bookingDate,
      bookingTime: d.bookingTime,
      hours: d.hours,
      cleaners: d.cleaners,
      totalAmount: d.totalAmount,
      notes: d.notes ?? null,
      specialRequests: d.specialRequests || [],
      supplies: d.supplies || [],
      status: 'confirmed',
      paymentIntentId,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      amountPaid: d.totalAmount,
      currency: CURRENCY,
      paidAt: new Date(),
      stripeStatus: paymentIntent?.status || 'succeeded'
    });
  } catch (err) {
    // Concurrent promotion (finalize + webhook race): the unique index rejects
    // the duplicate. Treat as already promoted.
    if (err.code === 11000) {
      await PendingBooking.deleteOne({ paymentIntentId }).catch(() => {});
      return Booking.findOne({ paymentIntentId });
    }
    throw err;
  }

  // Draft fulfilled — remove it so it isn't reaped/processed again.
  await PendingBooking.deleteOne({ paymentIntentId }).catch(() => {});

  // Confirmation email is best-effort — never fail a paid booking over email.
  try {
    const { subject, html, text } = renderBookingConfirmationEmail({
      customerName: d.customerName,
      serviceName: d.serviceName,
      bookingDate: d.bookingDate,
      bookingTime: d.bookingTime,
      hours: d.hours,
      cleaners: d.cleaners,
      streetName: d.streetName,
      houseNumber: d.houseNumber,
      totalAmount: d.totalAmount
    });
    await sendEmail({ email: d.customerEmail, subject, html, text });
  } catch (emailError) {
    console.error('Email send error:', emailError.message);
  }

  return booking;
};

/**
 * Issue a full refund for a paid card booking and return the fields to persist.
 * No-op (returns null) for manual/offline bookings, unpaid bookings, or those
 * already refunded. Throws on a Stripe failure so the caller can abort the
 * cancellation rather than mark a booking cancelled without releasing the money.
 *
 * @param {Object} booking  a booking doc/object with payment fields
 * @returns {Promise<Object|null>} { paymentStatus, refundId, refundedAt, stripeStatus } | null
 */
const refundBookingPayment = async (booking) => {
  if (
    booking.paymentMethod !== 'card' ||
    booking.paymentStatus !== 'paid' ||
    !booking.paymentIntentId
  ) {
    return null;
  }

  const refund = await stripe.refunds.create({ payment_intent: booking.paymentIntentId });

  return {
    paymentStatus: 'refunded',
    refundId: refund.id,
    refundedAt: new Date(),
    stripeStatus: 'refunded'
  };
};

/* ------------------------------------------------------- controllers ------ */

// POST /api/v1/payment/booking/intent
// Validate + price the booking server-side, store a PendingBooking draft, and
// create a Stripe PaymentIntent. Returns the clientSecret for the SPA to confirm.
const createBookingIntent = catchAsync(async (req, res, next) => {
  const { savePaymentMethod, savedPaymentMethodId } = req.body;

  // Fail-closed validation + server-side pricing (never trusts client totals).
  const draft = await buildValidatedBookingDraft(req.body, req.user);

  const customerId = await ensureStripeCustomer(req.user);

  // Base PaymentIntent params. allow_redirects:'never' keeps us to inline
  // (no-redirect) methods so the SPA can confirm with redirect:'if_required'
  // and we never need to build hosted return-url pages.
  const params = {
    amount: toMinorUnits(draft.totalAmount),
    currency: CURRENCY,
    customer: customerId,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { type: 'booking', userId: String(req.user._id) }
  };

  // Save the card on the customer for future bookings if requested.
  if (savePaymentMethod || savedPaymentMethodId) {
    params.setup_future_usage = 'off_session';
  }

  // Paying with a previously-saved card: verify it belongs to this customer,
  // then confirm server-side. The customer is actively in checkout, so this is
  // an ON-SESSION confirm (no off_session flag) — if the card needs 3DS, the
  // intent comes back as 'requires_action' and the client completes it inline,
  // rather than Stripe erroring as it would for a true off-session charge.
  if (savedPaymentMethodId) {
    let pm;
    try {
      pm = await stripe.paymentMethods.retrieve(savedPaymentMethodId);
    } catch {
      return next(new AppError("That saved card could not be found.", 400));
    }
    if (pm.customer !== customerId) {
      return next(new AppError("That payment method does not belong to your account.", 403));
    }
    params.payment_method = savedPaymentMethodId;
    params.confirm = true;
  }

  const paymentIntent = await stripe.paymentIntents.create(params);

  // Persist the validated draft keyed to this intent. Promotion happens only
  // once the intent succeeds (finalize endpoint or webhook backstop).
  const { user: _draftUser, ...draftFields } = draft;
  await PendingBooking.create({
    user: req.user._id,
    paymentIntentId: paymentIntent.id,
    savePaymentMethod: Boolean(savePaymentMethod || savedPaymentMethodId),
    draft: draftFields
  });

  res.status(201).json({
    status: "success",
    message: "Payment intent created.",
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
      amount: draft.totalAmount,
      currency: CURRENCY
    }
  });
});

// POST /api/v1/payment/booking/finalize
// Called by the client right after a successful payment for instant feedback.
// The webhook is the backstop; both funnel through the idempotent promote.
const finalizeBooking = catchAsync(async (req, res, next) => {
  const { paymentIntentId } = req.body;

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return next(new AppError("Payment not found.", 404));
  }

  if (paymentIntent.status !== 'succeeded') {
    return next(new AppError("Payment has not been completed yet.", 400));
  }

  // Ownership: the intent must belong to this user's Stripe customer.
  const fresh = await User.findById(req.user._id).select('stripeCustomerId');
  if (
    paymentIntent.customer &&
    fresh?.stripeCustomerId &&
    paymentIntent.customer !== fresh.stripeCustomerId
  ) {
    return next(new AppError("This payment does not belong to your account.", 403));
  }

  // Defense-in-depth: if the draft is still around, the captured amount must
  // match what we computed (the client can't change a server-created amount,
  // but we re-check anyway).
  const pending = await PendingBooking.findOne({ paymentIntentId });
  if (pending) {
    if (String(pending.user) !== String(req.user._id)) {
      return next(new AppError("This payment does not belong to your account.", 403));
    }
    if (paymentIntent.amount !== toMinorUnits(pending.draft.totalAmount)) {
      return next(new AppError("Payment amount mismatch.", 400));
    }
  }

  const booking = await promotePendingBooking(paymentIntentId, paymentIntent);

  if (!booking) {
    // No draft and no booking — the draft likely expired before payment.
    return next(new AppError("This booking could not be finalised. Please contact support.", 409));
  }

  // Only return the booking to its owner (a promoted webhook booking has a user).
  if (booking.user && String(booking.user) !== String(req.user._id)) {
    return next(new AppError("This payment does not belong to your account.", 403));
  }

  res.status(201).json({
    status: "success",
    message: "Booking created successfully!",
    data: { booking }
  });
});

// GET /api/v1/payment/methods — the user's saved cards.
const listPaymentMethods = catchAsync(async (req, res, next) => {
  const fresh = await User.findById(req.user._id).select('stripeCustomerId defaultPaymentMethodId');

  if (!fresh?.stripeCustomerId) {
    return res.status(200).json({
      status: "success",
      message: "No saved cards.",
      data: { paymentMethods: [] }
    });
  }

  const { data } = await stripe.paymentMethods.list({
    customer: fresh.stripeCustomerId,
    type: 'card'
  });

  const paymentMethods = data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
    isDefault: pm.id === fresh.defaultPaymentMethodId
  }));

  res.status(200).json({
    status: "success",
    message: "Saved cards returned successfully!",
    data: { paymentMethods }
  });
});

// POST /api/v1/payment/methods/setup-intent — add a card without a charge.
const createSetupIntent = catchAsync(async (req, res, next) => {
  const customerId = await ensureStripeCustomer(req.user);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
  });

  res.status(201).json({
    status: "success",
    message: "Setup intent created.",
    data: { clientSecret: setupIntent.client_secret }
  });
});

// DELETE /api/v1/payment/methods/:id — remove a saved card (ownership-checked).
const deletePaymentMethod = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const fresh = await User.findById(req.user._id).select('stripeCustomerId defaultPaymentMethodId');
  if (!fresh?.stripeCustomerId) {
    return next(new AppError("No saved cards to remove.", 404));
  }

  let pm;
  try {
    pm = await stripe.paymentMethods.retrieve(id);
  } catch {
    return next(new AppError("Card not found.", 404));
  }

  // Never detach a card that isn't this user's.
  if (pm.customer !== fresh.stripeCustomerId) {
    return next(new AppError("Card not found.", 404));
  }

  await stripe.paymentMethods.detach(id);

  // Clear the default pointer if we just removed the default card.
  if (fresh.defaultPaymentMethodId === id) {
    await User.findByIdAndUpdate(req.user._id, { $unset: { defaultPaymentMethodId: "" } });
  }

  res.status(200).json({
    status: "success",
    message: "Card removed successfully!"
  });
});

module.exports = {
  createBookingIntent,
  finalizeBooking,
  listPaymentMethods,
  createSetupIntent,
  deletePaymentMethod,
  // Shared with the webhook handler and booking controller.
  promotePendingBooking,
  refundBookingPayment
};
