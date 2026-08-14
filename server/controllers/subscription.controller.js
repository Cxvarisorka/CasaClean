const mongoose = require('mongoose');

const stripe = require('../config/stripe.config');
const Subscription = require('../models/subscription.model');
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const {
  addDaysToDateString,
  localMidnight,
  todayString
} = require('../utils/date.util');
const {
  getChargeLeadDays,
  renderSubscriptionCancelledEmail,
  sendBestEffortEmail
} = require('../services/subscription.service');

const CUSTOMER_SUBSCRIPTION_FIELDS = [
  'serviceId', 'cityId', 'intervalDays', 'status', 'pausedReason',
  'nextServiceDate', 'nextChargeAt', 'failedAttempts', 'lastChargeStatus',
  'lastChargeAt', 'lastError', 'lastCycleAmount', 'chargeAttempts',
  'createdAt', 'updatedAt', 'cancelledAt'
].join(' ');

const ADMIN_SUBSCRIPTION_FIELDS = [
  'user', 'serviceId', 'cityId', 'customerName', 'customerEmail',
  'customerPhone', 'streetName', 'houseNumber', 'propertySize',
  'doorbellName', 'bookingTime', 'hours', 'cleaners', 'notes',
  'specialRequests', 'cleaningTools', 'supplies', 'intervalDays', 'status',
  'pausedReason', 'nextServiceDate', 'nextChargeAt', 'failedAttempts',
  'lastChargeStatus', 'lastChargeAt', 'lastError', 'lastCycleAmount',
  'chargeAttempts', 'processingAt', 'pausedAt', 'cancelledAt', 'createdAt',
  'updatedAt'
].join(' ');

const assertObjectId = (id, next) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    next(new AppError('Invalid subscription id!', 400));
    return false;
  }
  return true;
};

const getOwnedSubscription = async (req, res, next) => {
  const { id } = req.params;
  if (!assertObjectId(id, next)) return null;

  const subscription = await Subscription.findOne({ _id: id, user: req.user._id });
  if (!subscription) {
    next(new AppError('Subscription not found!', 404));
    return null;
  }
  return subscription;
};

const customerResponse = (subscription) => subscription?.toObject
  ? subscription.toObject()
  : subscription;

const assertNoChargeInProgress = (subscription) => {
  if (subscription.processingAt) {
    throw new AppError('A subscription charge is currently in progress. Please try again shortly.', 409);
  }
};

const getResumeSchedule = (subscription) => {
  const today = todayString();
  let nextServiceDate = subscription.nextServiceDate;

  // A paused subscription must never revive a service date in the past. Start
  // a fresh interval from today instead of resurrecting an old cadence/visit.
  if (nextServiceDate < today) {
    nextServiceDate = addDaysToDateString(today, subscription.intervalDays);
  }

  const chargeDate = addDaysToDateString(nextServiceDate, -getChargeLeadDays());
  return { nextServiceDate, nextChargeAt: localMidnight(chargeDate) };
};

const verifyStoredPaymentMethod = async (subscription) => {
  let paymentMethod;
  try {
    paymentMethod = await stripe.paymentMethods.retrieve(subscription.paymentMethodId);
  } catch {
    return false;
  }
  const customerId = typeof paymentMethod?.customer === 'string'
    ? paymentMethod.customer
    : paymentMethod?.customer?.id;
  return customerId === subscription.stripeCustomerId;
};

const resumeSubscription = async (subscription) => {
  if (subscription.status !== 'paused') {
    throw new AppError('Only paused subscriptions can be resumed.', 400);
  }

  if (!(await verifyStoredPaymentMethod(subscription))) {
    throw new AppError('Please update your card first.', 400);
  }

  const schedule = getResumeSchedule(subscription);
  const resumed = await Subscription.findOneAndUpdate(
    { _id: subscription._id, status: 'paused' },
    {
      $set: {
        status: 'active',
        pausedReason: null,
        nextServiceDate: schedule.nextServiceDate,
        nextChargeAt: schedule.nextChargeAt,
        failedAttempts: 0,
        lastChargeStatus: null,
        lastError: null,
        processingAt: null
      },
      $unset: { pausedAt: '' }
    },
    { returnDocument: 'after' }
  ).select(CUSTOMER_SUBSCRIPTION_FIELDS);

  if (!resumed) {
    throw new AppError('Subscription state changed; please try again.', 409);
  }
  return resumed;
};

// GET /api/v1/subscription/my
const getMySubscriptions = catchAsync(async (req, res) => {
  const subscriptions = await Subscription.find({ user: req.user._id })
    .select(CUSTOMER_SUBSCRIPTION_FIELDS)
    .populate('serviceId', 'name')
    .populate('cityId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    message: 'Your subscriptions returned successfully!',
    subscriptionCount: subscriptions.length,
    data: { subscriptions }
  });
});

// PATCH /api/v1/subscription/:id/pause
const pauseMySubscription = catchAsync(async (req, res, next) => {
  const subscription = await getOwnedSubscription(req, res, next);
  if (!subscription) return;
  if (subscription.status !== 'active') {
    return next(new AppError('Only active subscriptions can be paused.', 400));
  }
  try {
    assertNoChargeInProgress(subscription);
  } catch (err) {
    return next(err);
  }

  const paused = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      user: req.user._id,
      status: 'active',
      processingAt: null
    },
    {
      $set: {
        status: 'paused',
        pausedReason: 'user-request',
        pausedAt: new Date(),
        processingAt: null
      }
    },
    { returnDocument: 'after' }
  ).select(CUSTOMER_SUBSCRIPTION_FIELDS);

  if (!paused) return next(new AppError('Subscription state changed; please try again.', 409));

  res.status(200).json({
    status: 'success',
    message: 'Subscription paused successfully!',
    data: { subscription: customerResponse(paused) }
  });
});

// PATCH /api/v1/subscription/:id/resume
const resumeMySubscription = catchAsync(async (req, res, next) => {
  const subscription = await getOwnedSubscription(req, res, next);
  if (!subscription) return;

  const resumed = await resumeSubscription(subscription);
  res.status(200).json({
    status: 'success',
    message: 'Subscription resumed successfully!',
    data: { subscription: customerResponse(resumed) }
  });
});

const cancelSubscription = async ({ subscription, ownerId = null }) => {
  if (subscription.status === 'cancelled') {
    throw new AppError('This subscription is already cancelled.', 400);
  }
  assertNoChargeInProgress(subscription);

  const filter = ownerId
    ? {
      _id: subscription._id,
      user: ownerId,
      status: { $ne: 'cancelled' },
      processingAt: null
    }
    : {
      _id: subscription._id,
      status: { $ne: 'cancelled' },
      processingAt: null
    };
  const cancelled = await Subscription.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        processingAt: null
      }
    },
    { returnDocument: 'after' }
  );

  if (!cancelled) {
    throw new AppError('Subscription state changed; please try again.', 409);
  }

  // Do not cancel or refund already-created paid Bookings here. Those are
  // independently managed through cancelMyBooking and the existing policy.
  sendBestEffortEmail({
    email: cancelled.customerEmail,
    ...renderSubscriptionCancelledEmail({ subscription: cancelled })
  });

  return cancelled;
};

// PATCH /api/v1/subscription/:id/cancel
const cancelMySubscription = catchAsync(async (req, res, next) => {
  const subscription = await getOwnedSubscription(req, res, next);
  if (!subscription) return;

  const cancelled = await cancelSubscription({ subscription, ownerId: req.user._id });
  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled successfully!',
    data: { subscription: customerResponse(cancelled) }
  });
});

// PATCH /api/v1/subscription/:id/payment-method
const updateMySubscriptionCard = catchAsync(async (req, res, next) => {
  const subscription = await getOwnedSubscription(req, res, next);
  if (!subscription) return;
  // A cancelled plan will never charge again — refuse to re-point its card so
  // the action can't silently succeed against dead state (the UI already hides
  // it, this closes the direct-API path).
  if (subscription.status === 'cancelled') {
    return next(new AppError('This subscription is cancelled.', 400));
  }
  try {
    assertNoChargeInProgress(subscription);
  } catch (err) {
    return next(err);
  }

  const freshUser = await User.findById(req.user._id).select('stripeCustomerId');
  if (!freshUser?.stripeCustomerId) {
    return next(new AppError('No saved cards yet.', 404));
  }

  let paymentMethod;
  try {
    paymentMethod = await stripe.paymentMethods.retrieve(req.body.paymentMethodId);
  } catch {
    return next(new AppError('Card not found.', 404));
  }
  const paymentMethodCustomerId = typeof paymentMethod.customer === 'string'
    ? paymentMethod.customer
    : paymentMethod.customer?.id;
  if (paymentMethodCustomerId !== freshUser.stripeCustomerId) {
    return next(new AppError('Card not found.', 404));
  }

  const updated = await Subscription.findOneAndUpdate(
    { _id: subscription._id, user: req.user._id, status: { $ne: 'cancelled' }, processingAt: null },
    {
      $set: {
        paymentMethodId: req.body.paymentMethodId,
        stripeCustomerId: freshUser.stripeCustomerId,
        failedAttempts: 0,
        lastError: null
      }
    },
    { returnDocument: 'after' }
  ).select(CUSTOMER_SUBSCRIPTION_FIELDS);

  // A charge may have claimed the doc (or its state changed) between the guard
  // and the write — never report success when nothing was updated.
  if (!updated) {
    return next(new AppError('Subscription state changed; please try again.', 409));
  }

  res.status(200).json({
    status: 'success',
    message: 'Subscription card updated successfully!',
    data: { subscription: customerResponse(updated) }
  });
});

// GET /api/v1/subscription (admin)
const getSubscriptions = catchAsync(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const statuses = ['active', 'paused', 'cancelled'];
  const filter = statuses.includes(req.query.status) ? { status: req.query.status } : {};
  const hasFilter = Object.keys(filter).length > 0;

  const [subscriptions, subscriptionCount] = await Promise.all([
    Subscription.find(filter)
      .select(ADMIN_SUBSCRIPTION_FIELDS)
      .populate('user', 'fullname email')
      .populate('serviceId', 'name')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    hasFilter ? Subscription.countDocuments(filter) : Subscription.estimatedDocumentCount()
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Subscriptions returned successfully!',
    subscriptionCount,
    data: { subscriptions }
  });
});

// GET /api/v1/subscription/:id (admin)
const getSubscriptionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!assertObjectId(id, next)) return;

  const [subscription, bookings] = await Promise.all([
    Subscription.findById(id)
      .select(ADMIN_SUBSCRIPTION_FIELDS)
      .populate('user', 'fullname email')
      .populate('serviceId', 'name')
      .populate('cityId', 'name')
      .lean(),
    Booking.find({ subscriptionId: id })
      .populate('serviceId', 'name')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .lean()
  ]);

  if (!subscription) return next(new AppError('Subscription not found!', 404));

  res.status(200).json({
    status: 'success',
    message: 'Subscription returned successfully!',
    data: { subscription, bookings }
  });
});

const adminPauseSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!assertObjectId(id, next)) return;

  const subscription = await Subscription.findById(id);
  if (!subscription) return next(new AppError('Subscription not found!', 404));
  if (subscription.status !== 'active') {
    return next(new AppError('Only active subscriptions can be paused.', 400));
  }
  try {
    assertNoChargeInProgress(subscription);
  } catch (err) {
    return next(err);
  }

  const paused = await Subscription.findOneAndUpdate(
    { _id: subscription._id, status: 'active', processingAt: null },
    {
      $set: {
        status: 'paused',
        pausedReason: null,
        pausedAt: new Date(),
        processingAt: null
      }
    },
    { returnDocument: 'after' }
  ).select(ADMIN_SUBSCRIPTION_FIELDS);
  if (!paused) return next(new AppError('Subscription state changed; please try again.', 409));

  res.status(200).json({
    status: 'success',
    message: 'Subscription paused successfully!',
    data: { subscription: paused }
  });
});

// The approved client plan includes an admin Resume action. It uses the same
// stored-card, stale-date, and failure-reset safeguards as customer resume.
const adminResumeSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!assertObjectId(id, next)) return;

  const subscription = await Subscription.findById(id);
  if (!subscription) return next(new AppError('Subscription not found!', 404));
  const resumed = await resumeSubscription(subscription);

  res.status(200).json({
    status: 'success',
    message: 'Subscription resumed successfully!',
    data: { subscription: resumed }
  });
});

const adminCancelSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!assertObjectId(id, next)) return;

  const subscription = await Subscription.findById(id);
  if (!subscription) return next(new AppError('Subscription not found!', 404));
  const cancelled = await cancelSubscription({ subscription });

  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled successfully!',
    data: { subscription: cancelled }
  });
});

module.exports = {
  getMySubscriptions,
  pauseMySubscription,
  resumeMySubscription,
  cancelMySubscription,
  updateMySubscriptionCard,
  getSubscriptions,
  getSubscriptionById,
  adminPauseSubscription,
  adminResumeSubscription,
  adminCancelSubscription
};
