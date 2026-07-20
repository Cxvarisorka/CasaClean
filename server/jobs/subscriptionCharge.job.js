// Subscription charge sweep
// -------------------------
// One process may run this job more than once (cron tick overlap), and multiple
// app instances may run it at the same time. The atomic processingAt claim plus
// Stripe's attempt-scoped idempotency key makes both cases safe.

const Subscription = require('../models/subscription.model');
const { chargeSubscriptionCycle } = require('../services/subscription.service');

// A worker crash must not lock a subscription indefinitely. This is deliberately
// an internal constant rather than a new required env setting; the product plan
// only makes scheduler cadence/configuration externally tunable.
const STALE_LOCK_MS = 30 * 60 * 1000;

let running = false;

const runSubscriptionCharges = async () => {
  if (running) {
    console.log('Subscription charge sweep skipped: previous sweep is still running.');
    return { skipped: true, processed: 0 };
  }

  running = true;
  let processed = 0;
  // A transient/non-Stripe error deliberately leaves nextChargeAt due after its
  // lock is cleared. Excluding already claimed ids prevents this one sweep from
  // spinning on that same subscription forever; the next hourly tick retries.
  const claimedIds = [];

  try {
    while (true) {
      const now = new Date();
      const claimFilter = {
        status: 'active',
        nextChargeAt: { $lte: now },
        $or: [
          { processingAt: null },
          { processingAt: { $lt: new Date(Date.now() - STALE_LOCK_MS) } }
        ]
      };
      if (claimedIds.length > 0) claimFilter._id = { $nin: claimedIds };

      const subscription = await Subscription.findOneAndUpdate(
        claimFilter,
        { $set: { processingAt: now } },
        { new: true }
      );

      if (!subscription) break;

      claimedIds.push(subscription._id);
      processed += 1;
      try {
        // The service catches and clears locks itself. Retain a defensive catch
        // here so an unexpected implementation error cannot strand the claim.
        await chargeSubscriptionCycle(subscription);
      } catch (err) {
        console.error('Unhandled subscription charge worker error:', err.message);
        await Subscription.updateOne(
          { _id: subscription._id, processingAt: subscription.processingAt },
          { $set: { processingAt: null } }
        ).catch((clearErr) => {
          console.error('Subscription worker lock clear error:', clearErr.message);
        });
      }
    }
  } finally {
    running = false;
  }

  return { skipped: false, processed };
};

module.exports = { runSubscriptionCharges, STALE_LOCK_MS };
