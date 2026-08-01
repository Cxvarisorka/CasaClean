// Recurring subscription domain service
// --------------------------------------
// This module deliberately contains plain async functions instead of Express
// handlers: both the cron worker and Stripe webhook need the same idempotent
// charge/booking logic without a req/res lifecycle.

const mongoose = require('mongoose');

const stripe = require('../config/stripe.config');
const Booking = require('../models/booking.model');
const Subscription = require('../models/subscription.model');
const sendEmail = require('../utils/email.util');
const AppError = require('../utils/appError.util');
const { toMinorUnits, fromMinorUnits } = require('../utils/money.util');
const {
  isValidIntervalDays,
  addDaysToDateString,
  localMidnight,
  todayString
} = require('../utils/date.util');
const {
  resolveServiceAndCity,
  resolveSpecialRequests,
  resolveCleaningTools,
  assertRecurrenceAllowed,
  computeBookingTotal,
  renderBookingConfirmationEmail,
  formatEuro
} = require('./booking.service');

const CURRENCY = 'eur';

const getChargeLeadDays = () => {
  const value = Number(process.env.CHARGE_LEAD_DAYS);
  return Number.isInteger(value) && value >= 0 ? value : 1;
};

const getMaxAttempts = () => {
  const value = Number(process.env.SUBSCRIPTION_MAX_ATTEMPTS);
  return Number.isInteger(value) && value > 0 ? value : 3;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripeId = (value) => (typeof value === 'string' ? value : value?.id);

const getErrorCode = (err) => err?.code || err?.decline_code || err?.raw?.code || null;
const getErrorMessage = (err) =>
  err?.message || err?.raw?.message || 'Your saved card could not be charged.';
const getErrorPaymentIntentId = (err) => stripeId(err?.payment_intent) || err?.raw?.payment_intent;
const isMissingPaymentMethodError = (err) =>
  err?.code === 'resource_missing' ||
  err?.statusCode === 404 ||
  err?.raw?.statusCode === 404 ||
  /(?:no such payment method|payment method.*(?:not found|missing)|card.*not found)/i
    .test(String(err?.message || err?.raw?.message || ''));

const getNextSchedule = (serviceDate, intervalDays) => {
  const nextServiceDate = addDaysToDateString(serviceDate, intervalDays);
  const chargeDate = addDaysToDateString(nextServiceDate, -getChargeLeadDays());
  return {
    nextServiceDate,
    nextChargeAt: localMidnight(chargeDate)
  };
};

const pushChargeAttempt = (attempt) => ({
  $push: {
    chargeAttempts: {
      $each: [attempt],
      $slice: -20
    }
  }
});

const sendBestEffortEmail = ({ email, subject, html, text }) => {
  sendEmail({ email, subject, html, text }).catch((err) => {
    console.error('Subscription email send error:', err.message);
  });
};

const renderChargeFailedEmail = ({ subscription, attemptNumber, errorMessage }) => {
  const maxAttempts = getMaxAttempts();
  const name = escapeHtml(subscription.customerName || 'there');
  const message = escapeHtml(errorMessage);
  const profileUrl = `${process.env.CLIENT_URL || ''}/profile`;
  const safeProfileUrl = escapeHtml(profileUrl);
  const subject = 'CasaClean — We could not charge your recurring cleaning';

  return {
    subject,
    html: `<!DOCTYPE html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;">
      <p>Hello ${name},</p>
      <p>We could not charge the saved card for your recurring CasaClean visit (attempt ${attemptNumber} of ${maxAttempts}).</p>
      <p>${message}</p>
      <p>We’ll retry tomorrow. You can update your saved card at <a href="${safeProfileUrl}">${safeProfileUrl}</a>.</p>
      <p>— CasaClean</p>
    </body></html>`,
    text:
      `Hello ${subscription.customerName || 'there'},\n\n` +
      `We could not charge your saved card for your recurring CasaClean visit (attempt ${attemptNumber} of ${maxAttempts}).\n` +
      `${errorMessage}\n\n` +
      `We'll retry tomorrow. Update your saved card at ${profileUrl}.\n\n— CasaClean`
  };
};

const renderSubscriptionPausedEmail = ({ subscription, reason, errorMessage }) => {
  const name = escapeHtml(subscription.customerName || 'there');
  const profileUrl = `${process.env.CLIENT_URL || ''}/profile`;
  const safeProfileUrl = escapeHtml(profileUrl);
  const reasonCopy = {
    'payment-failed': 'we could not charge your saved card after three attempts',
    'card-removed': 'the saved card is no longer available',
    'service-unavailable': 'the selected service, city, or add-on is no longer available'
  }[reason] || 'this cycle could not be completed';
  const safeReason = escapeHtml(reasonCopy);
  const detail = errorMessage ? `<p>${escapeHtml(errorMessage)}</p>` : '';
  const subject = 'CasaClean — Your recurring cleaning is paused';

  return {
    subject,
    html: `<!DOCTYPE html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;">
      <p>Hello ${name},</p>
      <p>Your recurring CasaClean service is paused because ${safeReason}.</p>
      ${detail}
      <p>Please review your subscription and saved card at <a href="${safeProfileUrl}">${safeProfileUrl}</a>, then resume it when ready.</p>
      <p>— CasaClean</p>
    </body></html>`,
    text:
      `Hello ${subscription.customerName || 'there'},\n\n` +
      `Your recurring CasaClean service is paused because ${reasonCopy}.\n` +
      `${errorMessage ? `${errorMessage}\n` : ''}\n` +
      `Review your subscription and saved card at ${profileUrl}, then resume it when ready.\n\n— CasaClean`
  };
};

const renderSubscriptionCancelledEmail = ({ subscription }) => {
  const name = escapeHtml(subscription.customerName || 'there');
  const subject = 'CasaClean — Your recurring cleaning is cancelled';

  return {
    subject,
    html: `<!DOCTYPE html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;">
      <p>Hello ${name},</p>
      <p>Your recurring CasaClean service has been cancelled. Already-created paid bookings are unchanged and can be managed separately from your profile.</p>
      <p>— CasaClean</p>
    </body></html>`,
    text:
      `Hello ${subscription.customerName || 'there'},\n\n` +
      `Your recurring CasaClean service has been cancelled. Already-created paid bookings are unchanged and can be managed separately from your profile.\n\n— CasaClean`
  };
};

const sendCycleReceipt = ({ subscription, serviceName, serviceDate, amount }) => {
  try {
    const { subject, html, text } = renderBookingConfirmationEmail({
      customerName: subscription.customerName,
      serviceName,
      bookingDate: serviceDate,
      bookingTime: subscription.bookingTime,
      hours: subscription.hours,
      cleaners: subscription.cleaners,
      streetName: subscription.streetName,
      houseNumber: subscription.houseNumber,
      totalAmount: amount,
      recurring: true
    });
    sendBestEffortEmail({ email: subscription.customerEmail, subject, html, text });
  } catch (err) {
    console.error('Subscription receipt render error:', err.message);
  }
};

/**
 * Creates the recurring template once the first on-session payment has
 * succeeded. `firstPaymentIntentId` makes this safe across finalize/webhook
 * races; the winning Subscription is always backfilled onto the first Booking.
 */
const createSubscriptionFromFirstBooking = async ({ pending, booking, paymentIntent }) => {
  const intervalDays = Number(pending?.recurrence?.intervalDays);
  if (!isValidIntervalDays(intervalDays)) return null;

  const paymentIntentId = paymentIntent?.id || pending.paymentIntentId;
  let resolvedPaymentIntent = paymentIntent;
  if (!stripeId(resolvedPaymentIntent?.customer) || !stripeId(resolvedPaymentIntent?.payment_method)) {
    resolvedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  const stripeCustomerId = stripeId(resolvedPaymentIntent?.customer);
  const paymentMethodId = stripeId(resolvedPaymentIntent?.payment_method);
  if (!stripeCustomerId || !paymentMethodId) {
    throw new AppError('A recurring booking requires a saved card.', 400);
  }

  const draft = pending.draft;
  const schedule = getNextSchedule(draft.bookingDate, intervalDays);

  let subscription;
  try {
    subscription = await Subscription.create({
      user: pending.user,
      serviceId: draft.serviceId,
      cityId: draft.cityId,
      customerName: draft.customerName,
      customerEmail: draft.customerEmail,
      customerPhone: draft.customerPhone,
      streetName: draft.streetName,
      houseNumber: draft.houseNumber,
      propertySize: draft.propertySize,
      doorbellName: draft.doorbellName,
      bookingTime: draft.bookingTime,
      hours: draft.hours,
      cleaners: draft.cleaners,
      notes: draft.notes ?? null,
      specialRequests: draft.specialRequests || [],
      cleaningTools: draft.cleaningTools || [],
      supplies: draft.supplies || [],
      intervalDays,
      nextServiceDate: schedule.nextServiceDate,
      nextChargeAt: schedule.nextChargeAt,
      stripeCustomerId,
      paymentMethodId,
      firstPaymentIntentId: paymentIntentId
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    subscription = await Subscription.findOne({ firstPaymentIntentId: paymentIntentId });
  }

  if (subscription && booking?._id) {
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { subscriptionId: subscription._id } }
    );
  }

  return subscription;
};

/**
 * Resolve all live references and calculate the amount for one cycle. This
 * intentionally does NOT call assertBookingWindow: the customer chose the
 * fixed slot on the first booking, and a retry on service morning must not be
 * rejected merely because the clock has passed that slot.
 */
const priceSubscriptionCycle = async (subscription) => {
  const { service, city } = await resolveServiceAndCity(
    String(subscription.serviceId),
    String(subscription.cityId)
  );

  // An admin can stop offering recurrence on a service (or narrow its cadences)
  // long after a plan was created. Re-check it per cycle, alongside the rest of
  // reference resolution, so the plan pauses instead of quietly charging on a
  // cadence the service no longer sells. The caller turns this AppError into a
  // 'service-unavailable' pause and notifies the customer.
  assertRecurrenceAllowed(service, subscription.intervalDays);

  const specialRequests = await resolveSpecialRequests(subscription.specialRequests, service);
  const cleaningTools = await resolveCleaningTools(subscription.cleaningTools, service);

  const totalAmount = computeBookingTotal({
    service,
    hours: subscription.hours,
    cleaners: subscription.cleaners,
    specialRequests,
    cleaningTools
  });

  return { service, city, specialRequests, cleaningTools, totalAmount };
};

// Create a paid cycle booking directly. There is no PendingBooking for an
// unattended charge; the existing sparse-unique paymentIntentId index is the
// idempotency boundary and resolves job/webhook races.
const createBookingFromSubscription = async ({
  subscription,
  paymentIntent,
  serviceDate,
  totalAmount,
  specialRequests,
  cleaningTools
}) => {
  const existing = await Booking.findOne({ paymentIntentId: paymentIntent.id });
  if (existing) return existing;

  try {
    return await Booking.create({
      user: subscription.user,
      serviceId: subscription.serviceId,
      cityId: subscription.cityId,
      customerName: subscription.customerName,
      customerEmail: subscription.customerEmail,
      customerPhone: subscription.customerPhone,
      streetName: subscription.streetName,
      houseNumber: subscription.houseNumber,
      propertySize: subscription.propertySize,
      doorbellName: subscription.doorbellName,
      bookingDate: serviceDate,
      bookingTime: subscription.bookingTime,
      hours: subscription.hours,
      cleaners: subscription.cleaners,
      totalAmount,
      notes: subscription.notes ?? null,
      specialRequests: specialRequests?.map((item) => item._id) || subscription.specialRequests || [],
      cleaningTools: cleaningTools?.map((item) => item._id) || subscription.cleaningTools || [],
      supplies: subscription.supplies || [],
      status: 'confirmed',
      paymentIntentId: paymentIntent.id,
      subscriptionId: subscription._id,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      amountPaid: totalAmount,
      currency: CURRENCY,
      paidAt: new Date(),
      stripeStatus: paymentIntent.status || 'succeeded'
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    return Booking.findOne({ paymentIntentId: paymentIntent.id });
  }
};

// Exactly one caller may advance a service date. A job and its Stripe webhook
// can both see the same successful PI, but the schedule predicate prevents the
// second caller from skipping an additional cycle.
const markCycleSucceeded = async ({ subscription, serviceDate, paymentIntent, totalAmount }) => {
  const now = new Date();
  const schedule = getNextSchedule(serviceDate, subscription.intervalDays);
  return Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      status: 'active',
      nextServiceDate: serviceDate,
      processingAt: subscription.processingAt
    },
    {
      $set: {
        nextServiceDate: schedule.nextServiceDate,
        nextChargeAt: schedule.nextChargeAt,
        failedAttempts: 0,
        lastChargeStatus: 'succeeded',
        lastChargeAt: now,
        lastError: null,
        lastCycleAmount: totalAmount,
        processingAt: null
      },
      ...pushChargeAttempt({
        at: now,
        serviceDate,
        status: 'succeeded',
        paymentIntentId: paymentIntent.id,
        amount: totalAmount
      })
    },
    { new: true }
  );
};

const clearProcessingAt = async (subscription) => {
  await Subscription.updateOne(
    { _id: subscription._id, processingAt: subscription.processingAt },
    { $set: { processingAt: null } }
  );
};

const pauseSubscription = async ({
  subscription,
  reason = null,
  errorMessage,
  errorCode = null,
  paymentIntentId = undefined,
  amount = undefined,
  recordAttempt = true
}) => {
  const now = new Date();
  const set = {
    status: 'paused',
    pausedReason: reason,
    pausedAt: now,
    processingAt: null,
    lastChargeStatus: 'failed',
    lastChargeAt: now,
    lastError: errorMessage || null
  };

  const update = { $set: set };
  if (recordAttempt) {
    Object.assign(update, pushChargeAttempt({
      at: now,
      serviceDate: subscription.nextServiceDate,
      status: 'failed',
      paymentIntentId,
      amount,
      errorCode,
      errorMessage
    }));
  }

  return Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      status: 'active',
      nextServiceDate: subscription.nextServiceDate,
      processingAt: subscription.processingAt
    },
    update,
    { new: true }
  );
};

/**
 * Record a Stripe card decline. failedAttempts counts *previous* failures, so
 * the first PI key is a0 and the third total decline pauses the subscription.
 */
const handleChargeFailure = async (subscription, err, amount = undefined) => {
  const now = new Date();
  const attemptNumber = Number(subscription.failedAttempts || 0) + 1;
  const maxAttempts = getMaxAttempts();
  const errorCode = getErrorCode(err);
  const errorMessage = getErrorMessage(err);
  const paymentIntentId = getErrorPaymentIntentId(err);
  const attempt = {
    at: now,
    serviceDate: subscription.nextServiceDate,
    status: 'failed',
    paymentIntentId,
    amount,
    errorCode,
    errorMessage
  };

  const set = {
    failedAttempts: attemptNumber,
    lastChargeStatus: 'failed',
    lastChargeAt: now,
    lastError: errorMessage,
    processingAt: null
  };

  if (attemptNumber >= maxAttempts) {
    set.status = 'paused';
    set.pausedReason = 'payment-failed';
    set.pausedAt = now;
  } else {
    set.nextChargeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const updated = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      status: 'active',
      nextServiceDate: subscription.nextServiceDate,
      processingAt: subscription.processingAt
    },
    {
      $set: set,
      ...pushChargeAttempt(attempt)
    },
    { new: true }
  );

  if (!updated) return null;

  if (attemptNumber >= maxAttempts) {
    sendBestEffortEmail({
      email: updated.customerEmail,
      ...renderSubscriptionPausedEmail({
        subscription: updated,
        reason: 'payment-failed',
        errorMessage
      })
    });
  } else {
    sendBestEffortEmail({
      email: updated.customerEmail,
      ...renderChargeFailedEmail({
        subscription: updated,
        attemptNumber,
        errorMessage
      })
    });
  }

  return updated;
};

/**
 * Charge exactly one already-claimed active subscription. All failures are
 * contained here so the scheduler can continue sweeping other subscriptions.
 */
const chargeSubscriptionCycle = async (subscription) => {
  try {
    // A customer/admin may pause or cancel after the scheduler claims this
    // document. Do not let a stale worker create a new unattended charge after
    // that state change; a stale-lock takeover also gets the same protection.
    const stillClaimed = await Subscription.exists({
      _id: subscription._id,
      status: 'active',
      processingAt: subscription.processingAt
    });
    if (!stillClaimed) return { outcome: 'claim-released' };

    const serviceDate = subscription.nextServiceDate;
    if (serviceDate < todayString()) {
      await pauseSubscription({
        subscription,
        errorMessage: 'This recurring service date was missed and will not be charged.',
        errorCode: 'cycle_missed',
        recordAttempt: false
      });
      return { outcome: 'paused-cycle-missed' };
    }

    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(subscription.paymentMethodId);
    } catch (err) {
      // Only a genuinely missing card pauses the subscription. A network/API
      // outage is a non-Stripe processing error: clear the claim and retry on
      // the next sweep without moving nextChargeAt or failure state.
      if (!isMissingPaymentMethodError(err)) throw err;
      const paused = await pauseSubscription({
        subscription,
        reason: 'card-removed',
        errorMessage: 'The saved card could not be found.',
        errorCode: getErrorCode(err) || 'payment_method_missing'
      });
      if (paused) {
        sendBestEffortEmail({
          email: paused.customerEmail,
          ...renderSubscriptionPausedEmail({
            subscription: paused,
            reason: 'card-removed',
            errorMessage: paused.lastError
          })
        });
      }
      return { outcome: 'paused-card-removed' };
    }

    if (!paymentMethod || stripeId(paymentMethod.customer) !== subscription.stripeCustomerId) {
      const paused = await pauseSubscription({
        subscription,
        reason: 'card-removed',
        errorMessage: 'The saved card is no longer attached to your account.',
        errorCode: 'payment_method_customer_mismatch'
      });
      if (paused) {
        sendBestEffortEmail({
          email: paused.customerEmail,
          ...renderSubscriptionPausedEmail({
            subscription: paused,
            reason: 'card-removed',
            errorMessage: paused.lastError
          })
        });
      }
      return { outcome: 'paused-card-removed' };
    }

    let priced;
    try {
      priced = await priceSubscriptionCycle(subscription);
    } catch (err) {
      if (!(err instanceof AppError) && !err?.isOperational) throw err;

      const paused = await pauseSubscription({
        subscription,
        reason: 'service-unavailable',
        errorMessage: err.message,
        errorCode: 'service_unavailable'
      });
      if (paused) {
        sendBestEffortEmail({
          email: paused.customerEmail,
          ...renderSubscriptionPausedEmail({
            subscription: paused,
            reason: 'service-unavailable',
            errorMessage: paused.lastError
          })
        });
      }
      return { outcome: 'paused-service-unavailable' };
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: toMinorUnits(priced.totalAmount),
          currency: CURRENCY,
          customer: subscription.stripeCustomerId,
          payment_method: subscription.paymentMethodId,
          off_session: true,
          confirm: true,
          receipt_email: subscription.customerEmail,
          metadata: {
            type: 'subscription-cycle',
            subscriptionId: String(subscription._id),
            serviceDate,
            userId: String(subscription.user)
          }
        },
        {
          // Attempts deliberately form part of the key: Stripe replays a
          // failed response for a reused key, so a retry must be a1/a2/etc.
          idempotencyKey: `subcycle:${subscription._id}:${serviceDate}:a${subscription.failedAttempts}`
        }
      );
    } catch (err) {
      // authentication_required is a StripeCardError too. Off-session 3DS is
      // impossible, so it is intentionally treated as an ordinary decline.
      if (err?.type === 'StripeCardError') {
        await handleChargeFailure(subscription, err, priced.totalAmount);
        return { outcome: 'card-declined' };
      }
      throw err;
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Subscription PaymentIntent ${paymentIntent.id} returned ${paymentIntent.status}.`);
    }

    await createBookingFromSubscription({
      subscription,
      paymentIntent,
      serviceDate,
      totalAmount: priced.totalAmount,
      specialRequests: priced.specialRequests,
      cleaningTools: priced.cleaningTools
    });

    const advanced = await markCycleSucceeded({
      subscription,
      serviceDate,
      paymentIntent,
      totalAmount: priced.totalAmount
    });

    if (advanced) {
      sendCycleReceipt({
        subscription: advanced,
        serviceName: priced.service.name,
        serviceDate,
        amount: priced.totalAmount
      });
      return { outcome: 'succeeded', subscription: advanced };
    }

    // A webhook may have won the conditional schedule advance. Its own update
    // clears the lock, but make that invariant explicit for other race paths.
    await clearProcessingAt(subscription);
    return { outcome: 'already-succeeded' };
  } catch (err) {
    // Transient/non-Stripe errors must neither increment failure state nor move
    // nextChargeAt. The next hourly sweep gets another chance.
    console.error('Subscription charge error:', err.message);
    await clearProcessingAt(subscription).catch((clearErr) => {
      console.error('Subscription lock clear error:', clearErr.message);
    });
    return { outcome: 'error', error: err };
  }
};

/**
 * Webhook backstop for a successful subscription-cycle PaymentIntent. The job
 * normally creates the booking synchronously, but a crash between Stripe's
 * success and the direct Booking.create must still never leave a paid cycle
 * without a reservation.
 */
const ensureSubscriptionCycleBooking = async (paymentIntent) => {
  const metadata = paymentIntent?.metadata || {};
  const subscriptionId = metadata.subscriptionId;
  const serviceDate = metadata.serviceDate;

  if (
    !mongoose.Types.ObjectId.isValid(subscriptionId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(serviceDate || ''))
  ) {
    return null;
  }

  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) return null;

  // Metadata is written only by this server and Stripe signs the event, but
  // keep reference resolution fail-closed before attaching a paid booking.
  if (
    String(subscription.user) !== String(metadata.userId) ||
    stripeId(paymentIntent.customer) !== subscription.stripeCustomerId
  ) {
    return null;
  }

  const amount = fromMinorUnits(paymentIntent.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;

  // Idempotent fast path: the charge worker normally created this cycle's
  // booking synchronously, so a duplicate/late delivery just returns it.
  const existing = await Booking.findOne({ paymentIntentId: paymentIntent.id });
  if (existing) return existing;

  // Nothing exists yet, so this really is the crash-repair path. Only create a
  // booking if the plan is STILL on this exact cycle — the same predicate
  // markCycleSucceeded uses. Without this gate a late webhook retry could add a
  // fresh confirmed booking to a subscription the customer has since paused or
  // cancelled (the schedule advance would correctly refuse, leaving the two
  // records disagreeing about whether the cycle happened).
  if (subscription.status !== 'active' || subscription.nextServiceDate !== serviceDate) {
    return null;
  }

  const booking = await createBookingFromSubscription({
    subscription,
    paymentIntent,
    serviceDate,
    totalAmount: amount
  });
  const advanced = await markCycleSucceeded({
    subscription,
    serviceDate,
    paymentIntent,
    totalAmount: amount
  });

  if (advanced) {
    sendCycleReceipt({
      subscription: advanced,
      serviceName: 'Cleaning service',
      serviceDate,
      amount
    });
  }

  return booking;
};

module.exports = {
  createSubscriptionFromFirstBooking,
  priceSubscriptionCycle,
  chargeSubscriptionCycle,
  handleChargeFailure,
  ensureSubscriptionCycleBooking,
  createBookingFromSubscription,
  renderChargeFailedEmail,
  renderSubscriptionPausedEmail,
  renderSubscriptionCancelledEmail,
  sendBestEffortEmail,
  getNextSchedule,
  getChargeLeadDays,
  getMaxAttempts,
  formatEuro
};
