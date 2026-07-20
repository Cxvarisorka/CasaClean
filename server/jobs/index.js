const cron = require('node-cron');

const { runSubscriptionCharges } = require('./subscriptionCharge.job');

let subscriptionChargeTask = null;

// Scheduling is intentionally opt-in through startJobs(). Requiring app.js is
// side-effect free for Jest and command-line scripts that import the app.
const startJobs = () => {
  if (subscriptionChargeTask) return subscriptionChargeTask;

  const expression = process.env.SUBSCRIPTION_CRON || '15 * * * *';
  subscriptionChargeTask = cron.schedule(expression, () => {
    runSubscriptionCharges().catch((err) => {
      console.error('Subscription cron sweep error:', err.message);
    });
  });

  console.log(`Subscription charge scheduler started (${expression}).`);
  return subscriptionChargeTask;
};

const stopJobs = () => {
  if (!subscriptionChargeTask) return;
  subscriptionChargeTask.stop();
  // node-cron v4 supports destroy; retain compatibility with a minimal mock or
  // earlier minor version used by a deployment.
  if (typeof subscriptionChargeTask.destroy === 'function') {
    subscriptionChargeTask.destroy();
  }
  subscriptionChargeTask = null;
};

module.exports = { startJobs, stopJobs };
