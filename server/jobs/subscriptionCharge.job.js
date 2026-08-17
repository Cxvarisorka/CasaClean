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

// How many cycles are charged at once. Each cycle is dominated by two Stripe
// round trips, so a strictly serial sweep spent almost all of its time waiting
// on the network: a backlog of N due plans took N × (Stripe latency) to drain.
//
// Kept deliberately small. Every worker holds a Mongo connection from the pool
// and an outbound Stripe request, and this runs on the same instance that is
// serving customer traffic — the goal is to stop idling on the network, not to
// let a large backlog crowd out live requests. Concurrency here is safe for the
// same reason running several app instances is: each subscription is claimed
// atomically, re-verified inside chargeSubscriptionCycle, and charged under an
// attempt-scoped idempotency key, and no two subscriptions share mutable state.
const CONCURRENCY = 5;

let running = false;

/**
 * Atomically claim one due subscription, or return null when none is claimable.
 *
 * `sweepStartedAt` is what keeps a single sweep from spinning: a transient,
 * non-Stripe error deliberately leaves nextChargeAt due after its lock is
 * cleared, so without an exclusion this query would hand back the same document
 * forever. Excluding anything already claimed *during this sweep* leaves it for
 * the next hourly tick.
 *
 * This used to be an `_id: { $nin: [...claimedIds] }` array that grew by one
 * element per iteration, so the filter itself got larger the more work there was
 * to do — quadratic in the size of the backlog. A timestamp comparison is O(1)
 * regardless of how many cycles the sweep processes.
 */
const claimNextDue = (sweepStartedAt) => {
  const now = new Date();
  return Subscription.findOneAndUpdate(
    {
      status: 'active',
      nextChargeAt: { $lte: now },
      $or: [
        { processingAt: null },
        { processingAt: { $lt: new Date(Date.now() - STALE_LOCK_MS) } }
      ],
      // Not yet attempted in this sweep.
      $and: [{
        $or: [
          { lastAttemptAt: null },
          { lastAttemptAt: { $lt: sweepStartedAt } }
        ]
      }]
    },
    { $set: { processingAt: now, lastAttemptAt: now } },
    { returnDocument: 'after' }
  );
};

const runSubscriptionCharges = async () => {
  if (running) {
    console.log('Subscription charge sweep skipped: previous sweep is still running.');
    return { skipped: true, processed: 0 };
  }

  running = true;
  let processed = 0;
  const sweepStartedAt = new Date();

  /**
   * One worker: claim and charge until nothing is left to claim. Several of
   * these run concurrently and coordinate purely through the atomic claim — a
   * document handed to one worker is invisible to the others.
   */
  const worker = async () => {
    while (true) {
      const subscription = await claimNextDue(sweepStartedAt);
      if (!subscription) return;

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
  };

  try {
    // allSettled, not all: one worker throwing (only possible from the claim
    // query itself — the charge is already guarded above) must not abandon the
    // cycles the other workers are part-way through.
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () => worker())
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Subscription charge worker failed:', result.reason?.message);
      }
    }
  } finally {
    running = false;
  }

  return { skipped: false, processed };
};

module.exports = { runSubscriptionCharges, STALE_LOCK_MS, CONCURRENCY };
