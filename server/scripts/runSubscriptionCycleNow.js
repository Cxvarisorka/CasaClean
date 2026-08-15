/*
 * Dev helper: force one recurring cycle to charge right now.
 * ---------------------------------------------------------------------------
 * Recurring charges normally run on a cron sweep (hourly by default), and only
 * pick up a subscription whose `nextChargeAt` has passed. That makes the most
 * important VAT behaviour — the treatment being RE-RESOLVED every cycle rather
 * than frozen at signup — practically untestable by hand: you would have to wait
 * out a real interval.
 *
 * This pulls a subscription's charge date into the past and runs the sweep once,
 * synchronously, so you can watch a single cycle happen.
 *
 * Run from `server/`:
 *
 *   node scripts/runSubscriptionCycleNow.js <subscriptionId>
 *   node scripts/runSubscriptionCycleNow.js <subscriptionId> --dry-run
 *
 * `--dry-run` prices the cycle and prints what WOULD be charged without touching
 * Stripe or creating a booking — the fastest way to check that a VAT status
 * change has taken effect.
 *
 * It charges a real card through whatever Stripe keys the environment carries,
 * so point it at test keys. It refuses to run when NODE_ENV looks like
 * production.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db.config');
const { isProduction } = require('../utils/env.util');
const Subscription = require('../models/subscription.model');
const { priceSubscriptionCycle } = require('../services/subscription.service');
const { runSubscriptionCharges } = require('../jobs/subscriptionCharge.job');

const [subscriptionId] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');

const run = async () => {
    if (isProduction) {
        throw new Error('Refusing to force a charge outside a dev/test environment.');
    }
    if (!mongoose.Types.ObjectId.isValid(subscriptionId || '')) {
        throw new Error('Usage: node scripts/runSubscriptionCycleNow.js <subscriptionId> [--dry-run]');
    }

    await connectDB();

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) throw new Error(`No subscription ${subscriptionId}.`);
    if (subscription.status !== 'active') {
        throw new Error(`Subscription is '${subscription.status}', not active — nothing would be charged.`);
    }

    if (dryRun) {
        const priced = await priceSubscriptionCycle(subscription);
        console.log(`Would charge €${priced.totalAmount.toFixed(2)} for ${priced.service.name}.`);
        console.log('Tax treatment:', priced.tax);
        return;
    }

    // Clear any stale processing lock too, so a previous interrupted run can't
    // make this one silently find nothing due.
    await Subscription.updateOne(
        { _id: subscription._id },
        { $set: { nextChargeAt: new Date(Date.now() - 60_000), processingAt: null } }
    );

    const result = await runSubscriptionCharges();
    console.log('Sweep result:', result);

    const after = await Subscription.findById(subscriptionId).lean();
    console.log(`Next service date is now ${after.nextServiceDate} (charge at ${after.nextChargeAt}).`);
    if (after.status !== 'active') {
        console.log(`Subscription is now '${after.status}': ${after.pausedReason || after.lastError || 'no reason recorded'}`);
    }
    console.log('The cycle booking and its invoice carry the tax snapshot — check both.');
};

run()
    .catch((err) => {
        console.error('Forced cycle failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
