// Stripe Customer resolution
// --------------------------
// A user's Stripe Customer is created lazily and then reused for everything that
// hangs off it — PaymentIntents, saved cards, and VAT numbers. Extracted into
// its own module so the payment controller and the tax service share one
// implementation instead of each racing to create a second customer for the
// same user.

const stripe = require('../config/stripe.config');
const User = require('../models/user.model');

/**
 * Return the user's Stripe Customer id, creating (and persisting) one the first
 * time it's needed.
 *
 * Reads the user fresh from the database rather than trusting the caller's
 * snapshot: `req.user` is captured at the start of the request, so a customer id
 * created earlier in the same session would otherwise be missed and a duplicate
 * Stripe Customer created.
 *
 * @param {Object} user  a user document or lean snapshot (needs at least _id)
 * @returns {Promise<string>} the Stripe Customer id
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

module.exports = { ensureStripeCustomer };
